import os

OUTPUT_FILE = "project_full.txt"
EXCLUDE_DIRS = {'.git', 'node_modules', 'venv', 'env', '__pycache__', 'dist', 'build', '.idea', '.vscode'}
EXCLUDE_EXTS = {'.png', '.jpg', '.jpeg', '.gif', '.ico', '.pdf', '.zip', '.exe', '.dll', '.svg', '.woff', '.ttf', '.mp4'}

def is_text_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            f.read(1024)
        return True
    except UnicodeDecodeError:
        return False

with open(OUTPUT_FILE, 'w', encoding='utf-8') as outfile:
    for root, dirs, files in os.walk('.'):
        # Удаляем исключенные папки из обхода
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        
        for file in files:
            if file == OUTPUT_FILE or file == "combine.py":
                continue
                
            ext = os.path.splitext(file)[1].lower()
            if ext in EXCLUDE_EXTS:
                continue
            
            filepath = os.path.join(root, file)
            
            if not is_text_file(filepath):
                continue
            
            try:
                with open(filepath, 'r', encoding='utf-8') as infile:
                    content = infile.read()
                    
                outfile.write(f"\n\n{'='*50}\n")
                outfile.write(f"--- Файл: {filepath} ---\n")
                outfile.write(f"{'='*50}\n\n")
                outfile.write(content)
            except Exception as e:
                print(f"Ошибка при чтении {filepath}: {e}")

print(f"✅ Готово! Весь код собран в файл {OUTPUT_FILE}")