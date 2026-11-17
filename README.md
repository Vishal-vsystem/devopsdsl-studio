# DevOpsDSL — Infrastructure Compiler Studio (v4.0)

**Course:** Compiler Design (`CSA1422`) | **Saveetha Engineering College (Autonomous)**  
**Project Guide:** Dr. K. Pandikumar  

A 5-phase Domain-Specific Infrastructure Compiler that compiles concise, type-safe infrastructure definitions into production-ready **Terraform HCL**, **Docker Compose**, **Kubernetes Manifests**, **Ansible Playbooks**, and **GitHub Actions CI** pipelines — catching undeclared resources, port type mismatches, and circular dependencies before deployment.

## Live Demo
- **Public Web App (GitHub Pages):** https://vishal-vsystem.github.io/devopsdsl-studio/

## Team & Module Ownership
| Module | Responsibility | Lead | Reg. No |
| :--- | :--- | :--- | :--- |
| **Module 01** | Lexical Analysis (DFA Tokenizer) | **K. Subashree** | 192522396 |
| **Module 02** | Syntax Analysis (CFG Recursive Descent & AST) | **Vishwa U** | 192511192 |
| **Module 03** | Semantic Analysis (Symbol Table, Type Safety & Cycles) | **Vishal Balaji J** | 192525014 |
| **Module 04** | Intermediate Representation (DAG, Kahn Sort & FinOps) | **Divya U** | 192372277 |
| **Module 05** | Multi-Target Code Generation & DevOps Synthesis | **Ganesh Reddy V** | 192525262 |

## Quick Run
```bash
# Local Python + Node.js workstation (http://localhost:8080)
python server.py

# Containerized with Nginx reverse proxy
docker compose up -d --build

# Automated Tests
node tests/test_compiler.js
pytest -v tests/test_server.py
```
