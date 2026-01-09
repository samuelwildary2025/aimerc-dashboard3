from .auth import router as auth_router, alias_router as auth_alias_router
from .supermarkets import router as supermarkets_router
from .pedidos import router as pedidos_router

__all__ = ["auth_router", "auth_alias_router", "supermarkets_router", "pedidos_router"]