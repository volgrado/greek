import os

directory = r"C:\Users\APRON\Documents\apps\greek\data\el\lessons"
count = 0
for filename in os.listdir(directory):
    if not filename.endswith(".md"): continue
    
    filepath = os.path.join(directory, filename)
    with open(filepath, "r", encoding="utf-8") as f:
        lines = f.readlines()
        
    new_lines = []
    changed = False
    for i, line in enumerate(lines):
        # We target top-level list items
        if line.startswith("- ") and i > 0:
            prev_line = lines[i-1].strip()
            # If the previous line is not a list item, not empty, and not a header
            if prev_line != "" and not prev_line.startswith("#") and not prev_line.startswith("-") and not prev_line.startswith(">"):
                new_lines.append("\n")
                changed = True
        new_lines.append(line)
        
    if changed:
        with open(filepath, "w", encoding="utf-8") as f:
            f.writelines(new_lines)
        count += 1
        print("Fixed", filename)

print("Total files fixed:", count)
