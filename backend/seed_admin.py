#!/usr/bin/env python3
"""Seed script to create default admin user"""
import sys
import os

# Add the parent directory to the path so we can import from app
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.database import engine, SessionLocal
from app.models.db_models import User, SubscriptionTier
from app.services.auth_service import AuthService


def create_admin_user(db: Session) -> User:
    """Create default admin user if it doesn't exist"""
    admin_email = "admin@tarsoft.com"
    
    # Check if admin already exists
    existing_admin = db.query(User).filter(User.email == admin_email).first()
    if existing_admin:
        print(f"✓ Admin user already exists: {admin_email}")
        return existing_admin
    
    # Create admin user
    hashed_password = AuthService.hash_password("@admintarsoft123!")
    admin_user = User(
        email=admin_email,
        hashed_password=hashed_password,
        full_name="Admin",
        subscription_tier=SubscriptionTier.PRO,
        is_active=True,
        is_admin=True
    )
    
    db.add(admin_user)
    db.commit()
    db.refresh(admin_user)
    
    print(f"✓ Created admin user: {admin_email}")
    print(f"  Password: admin123")
    print(f"  Tier: PRO (unlimited)")
    return admin_user


if __name__ == "__main__":
    print("Creating default admin user...")
    db = SessionLocal()
    try:
        create_admin_user(db)
    except Exception as e:
        print(f"✗ Error creating admin user: {e}")
        db.rollback()
        sys.exit(1)
    finally:
        db.close()
    print("Done!")
