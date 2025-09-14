"""
Pure Lambda Python SDK
Official Python implementation for Pure Lambda standards
"""

from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="pure-lambda-sdk",
    version="1.0.0",
    author="Pure Lambda Foundation",
    author_email="sdk@pure-lambda.org",
    description="Official Python SDK for Pure Lambda",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/s0fractal/pure-lambda",
    packages=find_packages(where="src"),
    package_dir={"": "src"},
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "Topic :: Software Development :: Libraries",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
    ],
    python_requires=">=3.8",
    install_requires=[
        "blake3>=0.3.0",
        "ed25519>=1.5",
        "cbor2>=5.4.0",
        "ipld>=0.1.0",
        "multibase>=1.0.0",
        "multihash>=0.1.0",
        "pydantic>=2.0.0",
        "httpx>=0.24.0",
        "asyncio>=3.4.3",
    ],
    extras_require={
        "dev": [
            "pytest>=7.0",
            "pytest-asyncio>=0.21",
            "pytest-cov>=4.0",
            "black>=23.0",
            "mypy>=1.0",
            "ruff>=0.1.0",
        ],
        "docs": [
            "sphinx>=6.0",
            "sphinx-rtd-theme>=1.2",
        ],
    },
    entry_points={
        "console_scripts": [
            "pl-validate=pl_sdk.cli:validate",
            "pl-agent=pl_sdk.cli:agent",
            "pl-receipt=pl_sdk.cli:receipt",
        ],
    },
    project_urls={
        "Bug Reports": "https://github.com/s0fractal/pure-lambda/issues",
        "Source": "https://github.com/s0fractal/pure-lambda",
        "Documentation": "https://docs.pure-lambda.org",
    },
)