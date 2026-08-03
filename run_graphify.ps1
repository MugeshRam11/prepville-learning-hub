Write-Host "0. Detecting project files..."
$py = Get-Content graphify-out\.graphify_python -Raw
& $py -c "
import json
from graphify.detect import detect
from pathlib import Path
result = detect(Path('C:/Users/Rishi/Music/arun'))
Path('graphify-out/.graphify_detect.json').write_text(json.dumps(result, ensure_ascii=False), encoding='utf-8')
"

Write-Host "1. Extracting dependencies with Madge..."
npx madge src --ts-config tsconfig.json --extensions ts,tsx --json | Out-File -Encoding utf8 -FilePath graphify-out/madge_deps.json

Write-Host "2. Repairing Graphify AST..."
$py = Get-Content graphify-out\.graphify_python -Raw
& $py "C:\Users\Rishi\.gemini\antigravity-ide\brain\601e5e43-ed62-4082-bb29-1f63c5b57835\scratch\repair_graphify_ast.py"

Write-Host "3. Merging and Building Graph..."
& $py -c "
import sys, json
from pathlib import Path
from graphify.build import build_from_json
from graphify.cluster import cluster, score_all
from graphify.analyze import god_nodes, surprising_connections, suggest_questions
from graphify.report import generate
from graphify.export import to_json

Path('graphify-out/.graphify_semantic.json').write_text(json.dumps({'nodes':[],'edges':[],'input_tokens':0,'output_tokens':0}, ensure_ascii=False), encoding='utf-8')
ast = json.loads(Path('graphify-out/.graphify_ast.json').read_text(encoding='utf-8'))
sem = json.loads(Path('graphify-out/.graphify_semantic.json').read_text(encoding='utf-8'))

merged = {
    'nodes': ast['nodes'] + sem['nodes'],
    'edges': ast['edges'] + sem['edges'],
    'hyperedges': sem.get('hyperedges', []),
    'input_tokens': sem.get('input_tokens', 0),
    'output_tokens': sem.get('output_tokens', 0),
}
Path('graphify-out/.graphify_extract.json').write_text(json.dumps(merged, indent=2, ensure_ascii=False), encoding='utf-8')

extraction = merged
detection = json.loads(Path('graphify-out/.graphify_detect.json').read_text(encoding='utf-8'))

G = build_from_json(extraction, root='C:\\Users\\Rishi\\Music\\arun', directed=False)
communities = cluster(G)
cohesion = score_all(G, communities)
tokens = {'input': 0, 'output': 0}
gods = god_nodes(G)
surprises = surprising_connections(G, communities)
labels = {cid: 'Community ' + str(cid) for cid in communities}

# Fix labels
for cid, nodes in communities.items():
    if not nodes:
        continue
    first_node = nodes[0].split('_')[-2] if len(nodes[0].split('_')) > 1 else nodes[0]
    labels[cid] = f'{first_node.capitalize()} Features'

questions = suggest_questions(G, communities, labels)
to_json(G, communities, 'graphify-out/graph.json')
report = generate(G, communities, cohesion, labels, gods, surprises, detection, tokens, 'C:\\Users\\Rishi\\Music\\arun', suggested_questions=questions)
Path('graphify-out/GRAPH_REPORT.md').write_text(report, encoding='utf-8')
Path('graphify-out/.graphify_labels.json').write_text(json.dumps({str(k): v for k, v in labels.items()}, ensure_ascii=False), encoding='utf-8')
print('Graph Built and Labeled!')
"

Write-Host "4. Exporting HTML..."
& $py -c "
import json
import networkx as nx
from graphify.export import to_html
from pathlib import Path

data = json.loads(Path('graphify-out/graph.json').read_text(encoding='utf-8'))
if 'links' in data and 'edges' not in data:
    data['edges'] = data['links']
    
G = nx.node_link_graph(data)

communities = {}
for node in data['nodes']:
    cid = node.get('community', 0)
    if cid not in communities:
        communities[cid] = []
    communities[cid].append(node['id'])

to_html(G, communities, 'graphify-out/graph.html')
"

Write-Host "5. Exporting Obsidian Vault..."
& $py "C:\Users\Rishi\.gemini\antigravity-ide\brain\601e5e43-ed62-4082-bb29-1f63c5b57835\scratch\export_obsidian.py"

Write-Host "6. Opening Obsidian Vault..."
Start-Process "obsidian://open?vault=graphify-out&file=GRAPH_REPORT.md"
