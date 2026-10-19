"""One-off helper: creates the PostgreSQL database named in .env if it is missing."""

import os
from pathlib import Path

import psycopg
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")

name = os.environ.get("DB_NAME", "primeschool")
connection = psycopg.connect(
    host=os.environ.get("DB_HOST", "localhost"),
    port=os.environ.get("DB_PORT", "5432"),
    user=os.environ.get("DB_USER", "postgres"),
    password=os.environ.get("DB_PASSWORD", ""),
    dbname="postgres",
    autocommit=True,
)
exists = connection.execute("SELECT 1 FROM pg_database WHERE datname = %s", (name,)).fetchone()
if exists:
    print(f"Database '{name}' already exists.")
else:
    connection.execute(f'CREATE DATABASE "{name}"')
    print(f"Database '{name}' created.")
connection.close()
