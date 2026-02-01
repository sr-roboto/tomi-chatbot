import os
import time
import gc
from langchain_community.document_loaders import PyPDFLoader
from langchain_community.chat_models import ChatOllama
from langchain_openai import ChatOpenAI
# Add back Google imports for Hybrid support
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_community.embeddings.fastembed import FastEmbedEmbeddings
from langchain_community.vectorstores import FAISS
from langchain.chains import RetrievalQA
from langchain.docstore.document import Document
from langchain.prompts import PromptTemplate
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class RAGService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(RAGService, cls).__new__(cls)
            cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        # Determine Provider
        self.provider = os.getenv("AI_PROVIDER", "gemini").lower()
        print(f"-------- RAG SERVICE INITIALIZING --------")
        print(f"Active Provider: {self.provider.upper()}")
        
        self.vector_store = None
        self.qa_chain = None

        # --- UNIVERSAL EMBEDDINGS (FastEmbed) ---
        # We use FastEmbed for EVERY provider to avoid rate limits and keep it fast/light.
        print("Initializing FastEmbed (Lightweight CPU Embeddings)...")
        self.embeddings = FastEmbedEmbeddings(model_name="BAAI/bge-small-en-v1.5")

        if self.provider == "gemini":
            # --- GOOGLE GEMINI CONFIGURATION ---
            self.api_key = os.getenv("GOOGLE_API_KEY")
            if not self.api_key:
                print("CRITICAL WARNING: GOOGLE_API_KEY not found. Gemini will fail.")
            
            print("Using Google Gemini (LLM)...")
            self.llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", google_api_key=self.api_key, temperature=0.3)
            self.index_path = "faiss_index_gemini_fastembed"

        elif self.provider == "deepseek":
            # (DeepSeek logic kept as backup)
            self.api_key = os.getenv("DEEPSEEK_API_KEY")
            print("Using DeepSeek API (LLM)...")
            self.llm = ChatOpenAI(
                model='deepseek-chat', 
                openai_api_key=self.api_key, 
                openai_api_base='https://api.deepseek.com',
                max_tokens=1024
            )
            self.index_path = "faiss_index_deepseek_fastembed"
        
        elif self.provider == "ollama":
             # --- OLLAMA LOCAL CONFIGURATION ---
             self.ollama_base_url = os.getenv("OLLAMA_BASE_URL", "http://ollama:11434")
             print(f"Connecting to Ollama at {self.ollama_base_url}")
             
             # Smartest/Fastest balance: Llama 3.2 (3B)
             self.llm_model = "llama3.2" 
             
             # Attempt to pull the model if not exists (Basic check)
             try:
                 import requests
                 print(f"Checking if model {self.llm_model} is available locally...")
                 # Check if model exists first to avoid unnecessary pull
                 tags_response = requests.get(f"{self.ollama_base_url}/api/tags", timeout=3)
                 
                 model_exists = False
                 if tags_response.status_code == 200:
                    models = [m['name'] for m in tags_response.json().get('models', [])]
                    # Check for partial match (e.g. llama3.2:latest)
                    if any(self.llm_model in m for m in models):
                        print(f"Model {self.llm_model} found locally. Skipping download.")
                        model_exists = True
                 
                 if not model_exists:
                     print(f"Model {self.llm_model} not found. Triggering pull (this may take a while)...")
                     # Use a short timeout for the request setup, but let the pull happen in background or warn user
                     # We verify connection but don't block forever if possible, or we assume user will pull it.
                     requests.post(f"{self.ollama_base_url}/api/pull", json={"name": self.llm_model}, timeout=10)
                     
             except Exception as e:
                 print(f"Warning: Could not verify/pull model: {e}")
                 print("If you are using a local Ollama, make sure OLLAMA_HOST=0.0.0.0 is set!")

             self.llm = ChatOllama(
                 base_url=self.ollama_base_url,
                 model=self.llm_model,
                 temperature=0.3
             )
             self.index_path = "faiss_index_ollama_fastembed" # Separate index for Ollama-FastEmbed combo
        
        else:
             # Fallback
             print("Warning: Unknown provider.")
             self.index_path = "faiss_index_unknown"

        print(f"Vector Store Path: {self.index_path}")
        print(f"------------------------------------------")

    def ingest_pdfs(self, directory_path: str):
        """Loads all PDFs from the directory and creates a vector store incrementally."""
        print(f"Checking for existing vector store at {self.index_path}...")
        if os.path.exists(self.index_path):
            try:
                self.vector_store = FAISS.load_local(self.index_path, self.embeddings, allow_dangerous_deserialization=True)
                print("Loaded existing vector store from disk.")
            except Exception as e:
                print(f"Error loading existing index: {e}. Starting fresh.")
                self.vector_store = None
        else:
             print("No existing vector store found. Starting fresh.")
             self.vector_store = None

        if not os.path.exists(directory_path):
             print(f"Directory {directory_path} does not exist.")
             self._setup_qa_chain()
             return

        # Load processed files tracking - Save in DATA directory so it persists!
        # Use separate checklist per provider so we don't mix them up
        processed_files_path = os.path.join(directory_path, f"processed_files_{self.provider}.txt")
        processed_files = set()
        if os.path.exists(processed_files_path):
            with open(processed_files_path, 'r') as f:
                processed_files = set(f.read().splitlines())
            print(f"Found {len(processed_files)} previously processed files.")

        files = [f for f in os.listdir(directory_path) if f.endswith(".pdf")]
        total_files = len(files)
        print(f"Found {total_files} PDF files to process in total.")

        for index, filename in enumerate(files):
            if filename in processed_files:
                print(f"Skipping {filename} (already processed).")
                continue

            file_path = os.path.join(directory_path, filename)
            print(f"Processing file {index + 1}/{total_files}: {filename}...")
            
            # Retry loop for this specific file
            max_retries = 3
            success = False
            
            for attempt in range(max_retries):
                try:
                    loader = PyPDFLoader(file_path)
                    docs = loader.load_and_split()
                    
                    if not docs:
                        print(f"Warning: No text found in {filename}")
                        success = True # Treat as success to skip next time
                        break

                    # Add to Vector Store
                    if self.vector_store is None:
                        self.vector_store = FAISS.from_documents(docs, self.embeddings)
                    else:
                        self.vector_store.add_documents(docs)
                    
                    # Save progress immediately
                    self.vector_store.save_local(self.index_path)
                    
                    # Mark as processed
                    with open(processed_files_path, 'a') as f:
                        f.write(filename + "\n")
                    
                    print(f"Successfully embedded and saved {filename}.")
                    success = True
                    
                    # Cleanup
                    del docs
                    del loader
                    gc.collect()
                    
                    # Friendly pause to avoid rate limits
                    time.sleep(10)
                    break 

                except Exception as e:
                    error_str = str(e)
                    print(f"Error processing {filename} (Attempt {attempt+1}): {error_str}")
                    
                    # Check for Rate Limit (429)
                    if "429" in error_str or "ResourceExhausted" in error_str:
                        wait_time = 70 # Wait slightly longer than the requested 60s
                        print(f"Rate limit hit. Sleeping for {wait_time} seconds before retrying...")
                        time.sleep(wait_time)
                    else:
                        # General error, wait short time
                        time.sleep(5)
            
            if not success:
               print(f"Failed to process {filename} after all retries. Skipping for now.")

        # Final setup logic
        if self.vector_store is None:
             print("Vectors store is empty after processing. Creating dummy store to prevent crash.")
             self.vector_store = FAISS.from_documents([Document(page_content="No context available.", metadata={"source": "none"})], self.embeddings)
        
        self._setup_qa_chain()

    def _setup_qa_chain(self):
        # Custom Prompt Template
        template = """Sos un experto Asistente Pedagógico especializado en el uso de Pantallas Táctiles Interactivas en el aula. 
        Tu misión es ayudar a los docentes a integrar esta tecnología en sus clases.
        
        INSTRUCCIONES DE RESPUESTA:
        1. Sé CONCISO y VE AL GRANO.
        2. Usa Markdown para dar formato (Negritas, Listas, Títulos).
        3. NO escribas párrafos gigantes de texto plano. Usa listas (items) para facilitar la lectura.
        4. Si la respuesta es larga, divídela en pasos numerados.
        5. SIEMPRE respondé en español.

        Contexto: {context}

        Pregunta: {question}

        Respuesta (en Markdown y concisa):"""
        QA_CHAIN_PROMPT = PromptTemplate.from_template(template)

        if self.vector_store:
            self.qa_chain = RetrievalQA.from_chain_type(
                llm=self.llm,
                chain_type="stuff",
                retriever=self.vector_store.as_retriever(),
                chain_type_kwargs={"prompt": QA_CHAIN_PROMPT}
            )
            print("PDF Ingestion Complete. Vector Store Ready.")
        else:
            print("Vector Store not available. QA Chain skipped.")

    def get_answer(self, query: str) -> str:
        """Retrieves answer from RAG chain (Synchronous)."""
        if not self.qa_chain:
            return "I am not initialized with any documents yet. Please add PDF files to the data folder."
        
        try:
            result = self.qa_chain.invoke({"query": query})
            return result["result"]
        except Exception as e:
            return f"Error generating answer: {str(e)}"

    def stream_answer(self, query: str):
        """Generates a streaming answer from the RAG chain."""
        if not self.qa_chain:
            yield "I am not initialized with any documents yet. Please add PDF files to the data folder."
            return

        # --- SMART GREETING LOGIC ---
        query_lower = query.lower().strip()
        greetings = ["hola", "buenos dias", "buenas tardes", "buenas noches", "qué tal", "como estas"]
        
        # Exact match or starts with greeting (simple heuristic)
        is_greeting = any(query_lower.startswith(g) for g in greetings) and len(query_lower) < 20
        
        if is_greeting:
            # Simple response generator
            response = "¡Hola! Soy Tomi, tu asistente pedagógico. ¿En qué puedo ayudarte hoy a integrar la tecnología en tu aula?"
            # Simulate streaming
            for word in response.split():
                yield word + " "
                time.sleep(0.05)
            return
        # ---------------------------

        try:
            # We need to use the chain slightly differently for streaming
            # Or use the LLM directly with the context if we want fine-grained control, 
            # but chain.stream is supported in newer LangChain versions.
            # However, RetrievalQA might not stream the "result" key easily without newer syntax.
            # Let's try the modern .stream() method on the chain.
            
            # The result of .stream() on RetrievalQA is a stream of dictionaries.
            # We need to extract the "result" from the final step or tokens from the LLM.
            
            # A more robust way with standard RetrievalQA is to use a callback or just standard .stream() 
            # if the chain supports it. 
            
            # Let's try standard .stream() first.
            for chunk in self.qa_chain.stream({"query": query}):
                # RetrievalQA stream yields the full result at the end usually, not tokens, 
                # unless we configured the LLM to stream.
                
                # Actually, for true token streaming with RetrievalQA, we often need to construct the chain 
                # with a specific callback or use the newer LECL (LangChain Expression Language).
                # But let's try a simpler approach: 
                # We will manually retrieve docs and then stream the LLM.
                pass

            # ALTERNATIVE: Manual RAG for Streaming (More reliable for simple setups)
            docs = self.vector_store.as_retriever().get_relevant_documents(query)
            context = "\n\n".join([doc.page_content for doc in docs])
            
            prompt = f"""Sos un experto Asistente Pedagógico especializado en el uso de Pantallas Táctiles Interactivas en el aula. 
            Tu misión es ayudar a los docentes a integrar esta tecnología en sus clases.
            
            INSTRUCCIONES DE RESPUESTA:
            1. Sé CONCISO y VE AL GRANO.
            2. Usa Markdown para dar formato (Negritas, Listas, Títulos).
            3. NO escribas párrafos gigantes de texto plano. Usa listas (items) para facilitar la lectura.
            4. Si la respuesta es larga, divídela en pasos numerados.
            5. SIEMPRE respondé en español.

            Contexto: {context}

            Pregunta: {query}

            Respuesta (en Markdown y concisa):"""
            
            # Stream directly from LLM
            for chunk in self.llm.stream(prompt):
                # chunk is an AIMessageChunk
                yield chunk.content
                
        except Exception as e:
            yield f"Error generating stream: {str(e)}"

# Singleton usage
rag_service = RAGService()
