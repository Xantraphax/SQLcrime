let db;
const DB_NAME = "sql-noir-db";

// ---------- IndexedDB helpers ----------
function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = e => {
      e.target.result.createObjectStore("files");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function loadFromIDB() {
  const idb = await openIDB();
  return new Promise(resolve => {
    const tx = idb.transaction("files", "readonly");
    const store = tx.objectStore("files");
    const req = store.get("db");
    req.onsuccess = () => resolve(req.result || null);
  });
}

async function saveToIDB(data) {
  const idb = await openIDB();
  const tx = idb.transaction("files", "readwrite");
  tx.objectStore("files").put(data, "db");
}

// ---------- Init SQL.js ----------
initSqlJs({
  locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
}).then(async SQL => {

  const cached = await loadFromIDB();

  if (cached) {
    db = new SQL.Database(new Uint8Array(cached));
  } else {
    const res = await fetch("assets/case01.db");
    const buffer = await res.arrayBuffer();
    db = new SQL.Database(new Uint8Array(buffer));
    await saveToIDB(db.export());
  }

  document.getElementById("run").onclick = runQuery;
});

// ---------- Query execution ----------
function runQuery() {
  const sql = document.getElementById("sql").value;
  const output = document.getElementById("output");
  output.innerHTML = "";

  try {
    const results = db.exec(sql);
    if (results.length === 0) {
      output.textContent = "Query executed.";
    } else {
      renderTable(results[0], output);
    }
    saveToIDB(db.export());
  } catch (err) {
    output.textContent = err.message;
  }
}

function renderTable(result, container) {
  const table = document.createElement("table");
  const thead = document.createElement("tr");

  result.columns.forEach(col => {
    const th = document.createElement("th");
    th.textContent = col;
    thead.appendChild(th);
  });
  table.appendChild(thead);

  result.values.forEach(row => {
    const tr = document.createElement("tr");
    row.forEach(cell => {
      const td = document.createElement("td");
      td.textContent = cell;
      tr.appendChild(td);
    });
    table.appendChild(tr);
  });

  container.appendChild(table);
}
