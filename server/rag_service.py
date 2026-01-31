import os
import time
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

    def ingest_pdfs(self, directory_path: str):
        """Loads all PDFs from the directory and creates a vector store."""
        print(f"Ingesting PDFs from {directory_path}...")
        documents = []
        
        if not os.path.exists(directory_path):
             print(f"Directory {directory_path} does not exist.")
             return

        for filename in os.listdir(directory_path):
            if filename.endswith(".pdf"):
                file_path = os.path.join(directory_path, filename)
                try:
                    loader = PyPDFLoader(file_path)
                    docs = loader.load_and_split()
                    documents.extend(docs)
                    print(f"Loaded {filename}: {len(docs)} pages.")
                except Exception as e:
                    print(f"Error loading {filename}: {e}")

        if not documents:
            print("No PDF documents found or loaded.")
            # Create an empty vector store to avoid errors
            self.vector_store = FAISS.from_documents([Document(page_content="No context available.", metadata={"source": "none"})], self.embeddings)
            return

        # Create Vector Store with Batch Processing (Aggressive Batching for Stability)
        print(f"Total documents to embed: {len(documents)}")
        batch_size = 1 # Embed one by one to avoid 504 Timeouts
        self.vector_store = None
        
        for i in range(0, len(documents), batch_size):
            batch = documents[i : i + batch_size]
            print(f"Embedding batch {i // batch_size + 1}/{(len(documents) + batch_size - 1) // batch_size} ({len(batch)} docs)...")
            
            # Retry logic
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    if self.vector_store is None:
                        self.vector_store = FAISS.from_documents(batch, self.embeddings)
                    else:
                        self.vector_store.add_documents(batch)
                    time.sleep(2.0) # Significant delay to respect rate limits
                    break # Success, exit retry loop
                except Exception as e:
                    print(f"Error embedding batch {i} (Attempt {attempt+1}/{max_retries}): {e}")
                    if attempt < max_retries - 1:
                        wait_time = 2 ** (attempt + 1)
                        print(f"Retrying in {wait_time} seconds...")
                        time.sleep(wait_time)
                    else:
                        print(f"Failed to embed batch {i} after {max_retries} attempts. Skipping.")
        
        if self.vector_store is None:
             # Fallback if all batches failed
             print("Failed to initialize vector store from documents. Creating empty store.")
             try:
                self.vector_store = FAISS.from_documents([Document(page_content="No context available.", metadata={"source": "none"})], self.embeddings)
             except Exception as e:
                 print(f"CRITICAL: Could not create fallback vector store: {e}")
                 # Initialize empty to prevent crash, though it won't work for retrieval
                 self.vector_store = None # Or handle more gracefully depending on library support

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
