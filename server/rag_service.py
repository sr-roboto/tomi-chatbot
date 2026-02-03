import os
import time
import gc
from langchain_community.document_loaders import PyPDFLoader
from langchain_community.chat_models import ChatOllama
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI
from langchain_community.embeddings import HuggingFaceEmbeddings
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
        # Determine Provider - Default to OLLAMA
        self.provider = os.getenv("AI_PROVIDER", "ollama").lower()
        print(f"-------- RAG SERVICE INITIALIZING --------")
        print(f"Active Provider: {self.provider.upper()}")
        
        self.vector_store = None
        self.qa_chain = None

        # --- UNIVERSAL EMBEDDINGS (HuggingFace Local) ---
        # Optimized for CPU (Quantized/Small models like all-MiniLM-L6-v2)
        print("Initializing HuggingFace Embeddings (Local CPU)...")
        self.embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

        if self.provider == "gemini":
            # --- GEMINI CLOUD CONFIGURATION ---
            api_key = os.getenv("GOOGLE_API_KEY")
            if not api_key:
                print("CRITICAL ERROR: GOOGLE_API_KEY is missing for Gemini provider.")
            
            print("Connecting to Google Gemini (Flash Lite)...")
            self.llm = ChatGoogleGenerativeAI(
                model="gemini-flash-lite-latest", 
                google_api_key=api_key,
                temperature=0.3,
                convert_system_message_to_human=True
            )
            self.index_path = "faiss_index_gemini_local"

        elif self.provider == "deepseek":
            # --- DEEPSEEK API CONFIGURATION ---
            api_key = os.getenv("DEEPSEEK_API_KEY")
            if not api_key:
                print("CRITICAL ERROR: DEEPSEEK_API_KEY is missing.")
            
            print("Connecting to DeepSeek API...")
            self.llm = ChatOpenAI(
                model="deepseek-chat", 
                openai_api_key=api_key, 
                openai_api_base="https://api.deepseek.com",
                temperature=0.3
            )
            self.index_path = "faiss_index_deepseek_local"

        elif self.provider == "ollama":
            # --- OLLAMA LOCAL CONFIGURATION ---
            # Using Llama 3.2 (3B) - Best balance of Speed vs Intelligence
            base_url = os.getenv("OLLAMA_BASE_URL", "http://ollama:11434")
            print(f"Connecting to Ollama at {base_url} with model llama3.2...")
            self.llm = ChatOllama(
                model="llama3.2",
                base_url=base_url,
                temperature=0.1, 
                keep_alive="5m"
            )
            self.index_path = "faiss_index_ollama_local"
        
        else:
             # Fallback
             print(f"Warning: Unknown provider {self.provider}. Defaulting to Ollama settings.")
             self.index_path = "faiss_index_ollama_local"

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

        # Load processed files tracking
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
            
            # Retry loop
            max_retries = 3
            success = False
            
            for attempt in range(max_retries):
                try:
                    loader = PyPDFLoader(file_path)
                    docs = loader.load_and_split()
                    
                    if not docs:
                        print(f"Warning: No text found in {filename}")
                        success = True
                        break

                    # Add to Vector Store
                    if self.vector_store is None:
                        self.vector_store = FAISS.from_documents(docs, self.embeddings)
                    else:
                        self.vector_store.add_documents(docs)
                    
                    # Save progress
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
                    time.sleep(1) # Brief pause
                    break 

                except Exception as e:
                    error_str = str(e)
                    print(f"Error processing {filename} (Attempt {attempt+1}): {error_str}")
                    if "429" in error_str:
                        time.sleep(30)
                    else:
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
        template = """Sos un Asistente Pedagógico para Pantallas Táctiles, un experto en tecnología educativa.  
        Tu misión es ayudar a los docentes a integrar esta tecnología en sus clases.
        
        INSTRUCCIONES:
        1. Usa el CONTEXTO proporcionado para responder con precisión sobre el uso de la pantalla.
        2. Si el contexto no es suficiente, USA TU CONOCIMIENTO GENERAL para dar una respuesta útil y educativa.
        3. Sé CONCISO, AMABLE y VE AL GRANO.
        4. Usa Markdown para dar formato (Negritas, Listas, Títulos).
        5. SIEMPRE respondé en español.

        Contexto: {context}

        Pregunta: {question}

        Respuesta (Inteligente y útil):"""
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
        
        is_greeting = any(query_lower.startswith(g) for g in greetings) and len(query_lower) < 20
        
        if is_greeting:
            response = "¡Hola! Soy tu Asistente Pedagógico para Pantallas Táctiles. ¿En qué puedo ayudarte hoy a integrar la tecnología en tu aula?"
            for word in response.split():
                yield word + " "
                time.sleep(0.05)
            return
        
        try:
            # Manual RAG for reliable streaming
            docs = self.vector_store.as_retriever(search_kwargs={"k": 3}).get_relevant_documents(query)
            context = "\n\n".join([doc.page_content for doc in docs])
            
            prompt = f"""Eres un experto Asistente Pedagógico. 
            Ayuda al docente usando el siguiente contexto y tu propio conocimiento pedagógico.
            
            Contexto:
            {context}

            Pregunta: {query}

            Instrucciones:
            1. PRIORIZA la información del contexto si es relevante.
            2. Si la respuesta NO está en el contexto, RESPONDE con tu "conocimiento general" (no digas "no sé").
            3. Sé educativo, práctico y conciso.
            4. Usa Markdown (listas/negritas).
            
            Respuesta:"""
            
            # Stream directly from LLM
            for chunk in self.llm.stream(prompt):
                if hasattr(chunk, 'content'):
                    yield chunk.content
                else:
                    yield str(chunk)
                
        except Exception as e:
            yield f"Error generating stream: {str(e)}"

# Singleton usage
rag_service = RAGService()
