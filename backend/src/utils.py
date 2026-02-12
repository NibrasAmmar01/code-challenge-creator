from fastapi import HTTPException, Request
from clerk_backend_api import Clerk, AuthenticateRequestOptions
import os
from dotenv import load_dotenv
import logging
from pathlib import Path

# Load .env file from the correct location
env_path = Path(__file__).parent / '.env'  # Looks in src/.env
load_dotenv(dotenv_path=env_path)

# Also try to load from root as fallback
load_dotenv()  # This will look in current working directory

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Clerk SDK
CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY")
if not CLERK_SECRET_KEY:
    # Print debug info
    logger.error("CLERK_SECRET_KEY not found in environment variables")
    logger.error(f"Current working directory: {os.getcwd()}")
    logger.error(f"Looking for .env at: {env_path}")
    logger.error(f".env file exists: {env_path.exists()}")
    
    # List all environment variables starting with CLERK (safely)
    clerk_vars = {k: v[:10] + '...' for k, v in os.environ.items() if 'CLERK' in k}
    logger.error(f"Found CLERK_* env vars: {clerk_vars}")
    
    raise ValueError(
        "CLERK_SECRET_KEY not found in environment variables. "
        "Please ensure your .env file exists in backend/src/.env "
        "and contains CLERK_SECRET_KEY=your_key_here"
    )

clerk_sdk = Clerk(bearer_auth=CLERK_SECRET_KEY)

def authenticate_and_get_user_details(request: Request):
    """
    Authenticate a request using Clerk and return the user ID
    
    Args:
        request: FastAPI Request object containing the Authorization header
    
    Returns:
        dict: Contains the user_id from the authenticated token
    
    Raises:
        HTTPException: 401 if authentication fails, 500 if other errors occur
    """
    try:
        # Log the authorization header for debugging (remove in production)
        auth_header = request.headers.get("Authorization")
        if auth_header:
            logger.debug(f"Auth header present: {auth_header[:20]}...")
        else:
            logger.debug("No Authorization header found")
        
        # Authenticate the request with Clerk
        request_state = clerk_sdk.authenticate_request(
            request,
            AuthenticateRequestOptions(
                authorized_parties=[
                    "http://localhost:5173",
                    "http://localhost:5174",
                    "http://127.0.0.1:5173",
                    "http://127.0.0.1:5174",
                    "http://localhost:3000",
                    "http://127.0.0.1:3000"
                ],
                jwt_key=os.getenv("JWT_KEY")
            )
        )
        
        # Check if authentication was successful
        if not request_state.is_signed_in:
            logger.warning("Authentication failed: user not signed in")
            raise HTTPException(
                status_code=401,
                detail="Invalid or missing authentication token"
            )
        
        # Extract user ID from the token payload
        user_id = request_state.payload.get("sub")
        if not user_id:
            logger.error("No 'sub' claim found in token payload")
            raise HTTPException(
                status_code=401,
                detail="Invalid token payload: missing user ID"
            )
        
        logger.info(f"Successfully authenticated user: {user_id}")
        return {"user_id": user_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Authentication error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Authentication service error: {str(e)}"
        )