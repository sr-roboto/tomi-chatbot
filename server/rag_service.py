import os
import time
import gc
from langchain_community.document_loaders import PyPDFLoader
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain_community.vectorstores import FAISS
from langchain.chains import RetrievalQA
from langchain.docstore.document import Document
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
        self.api_key = os.getenv("GOOGLE_API_KEY")
        if not self.api_key:
            print("WARNING: GOOGLE_API_KEY not found in environment variables.")
        
        # Initialize Embeddings
        self.embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001", google_api_key=self.api_key)
        
        # Initialize Vector Store (FAISS)
        self.vector_store = None
        self.qa_chain = None
        
        # Initialize LLM
        self.llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", google_api_key=self.api_key, temperature=0.3)
        self.index_path = "faiss_index"

    def ingest_pdfs(self, directory_path: str):
        """Loads all PDFs from the directory and creates a vector store."""
        print(f"Checking for existing vector store at {self.index_path}...")
        if os.path.exists(self.index_path):
            try:
                self.vector_store = FAISS.load_local(self.index_path, self.embeddings, allow_dangerous_deserialization=True)
                print("Loaded existing vector store from disk.")
                self._setup_qa_chain()
                return
            except Exception as e:
                print(f"Error loading existing index: {e}. Re-ingesting.")

        print(f"Ingesting PDFs from {directory_path}...")
        
        if not os.path.exists(directory_path):
             print(f"Directory {directory_path} does not exist.")
             return

        self.vector_store = None
        files = [f for f in os.listdir(directory_path) if f.endswith(".pdf")]
        total_files = len(files)
        print(f"Found {total_files} PDF files to process.")

        for index, filename in enumerate(files):
            file_path = os.path.join(directory_path, filename)
            print(f"Processing file {index + 1}/{total_files}: {filename}...")
            
            try:
                # Load ONLY this file
                loader = PyPDFLoader(file_path)
                docs = loader.load_and_split()
                
                if not docs:
                    print(f"Warning: No text found in {filename}")
                    continue

                # Add to Vector Store immediately
                if self.vector_store is None:
                    self.vector_store = FAISS.from_documents(docs, self.embeddings)
                else:
                    self.vector_store.add_documents(docs)
                
                print(f"Successfully embedded {filename} ({len(docs)} pages).")
                
                # Cleanup to free memory
                del docs
                del loader
                gc.collect()

            except Exception as e:
                print(f"Error processing {filename}: {e}")
        
        if self.vector_store is None:
             print("Failed to initialize vector store from documents. Creating empty store.")
             self.vector_store = FAISS.from_documents([Document(page_content="No context available.", metadata={"source": "none"})], self.embeddings)
        else:
            try:
                self.vector_store.save_local(self.index_path)
                print(f"Vector store saved to {self.index_path}")
            except Exception as e:
                print(f"Error saving vector store: {e}")

        self._setup_qa_chain()

    def _setup_qa_chain(self):
        # Custom Prompt Template
        template = """Sos un experto Asistente Pedagógico especializado en el uso de Pantallas Táctiles Interactivas en el aula. 
        Tu misión es ayudar a los docentes a integrar esta tecnología en sus clases.
        
        Usa el siguiente contexto para responder la pregunta. Si la respuesta no está en el contexto, usa tu conocimiento general 
        sobre pedagogía y tecnología educativa para dar una respuesta útil y motivadora. SIEMPRE respondé en español.

        Contexto: {context}

        Pregunta: {question}

        Respuesta:"""
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
        """Retrieves answer from RAG chain."""
        if not self.qa_chain:
            return "I am not initialized with any documents yet. Please add PDF files to the data folder."
        
        try:
            result = self.qa_chain.invoke({"query": query})
            return result["result"]
        except Exception as e:
            return f"Error generating answer: {str(e)}"

# Singleton usage
rag_service = RAGService()
