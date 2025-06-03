import os
from dotenv import load_dotenv
import subprocess

load_dotenv()

# Read the URL
database_url = os.getenv("DATABASE_URL")


def make_request(query):
    print(database_url)
    psql_cmd = [
        "/opt/homebrew/opt/libpq/bin/psql",
        f"{database_url}",
        "-c",
        f"{query}",
    ]

    result = subprocess.run(
        psql_cmd,
        capture_output=True,
        text=True,
    )

    if result.returncode != 0:
        print("Request failed: ", result)
        raise RuntimeError("Failed to make psql request", result)

    return result
