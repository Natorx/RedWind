use rusqlite::{params, Connection, Result as SqliteResult};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::command;

// 词汇集结构
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WordSet {
    pub id: i32,
    pub name: String,
    pub is_official: bool,
    pub created_at: String,
}

// 单词项结构
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WordSetItem {
    pub id: i32,
    pub word_set_id: i32,
    pub word: String,
    pub meaning: String,
    pub example_sentence: Option<String>,
    pub order_index: i32,
}

// 数据库状态
pub struct DbState {
    pub conn: Mutex<Connection>,
}

impl DbState {
    pub fn new(conn: Connection) -> Self {
        DbState {
            conn: Mutex::new(conn),
        }
    }
}

// 获取应用数据目录的辅助函数
pub(crate) fn get_app_data_dir() -> std::path::PathBuf {
    if let Ok(current_exe) = std::env::current_exe() {
        if let Some(parent) = current_exe.parent() {
            return parent.join("data");
        }
    }
    std::path::PathBuf::from(".")
}

// 初始化数据库表
pub fn init_typing_table(conn: &Connection) -> SqliteResult<()> {
    // 创建词汇集表
    conn.execute(
        "CREATE TABLE IF NOT EXISTS word_sets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            is_official INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL
        )",
        [],
    )?;

    // 创建单词表（关联词汇集ID）- 添加 example_sentence 字段
    conn.execute(
        "CREATE TABLE IF NOT EXISTS word_set_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            word_set_id INTEGER NOT NULL,
            word TEXT NOT NULL,
            meaning TEXT NOT NULL,
            example_sentence TEXT,
            order_index INTEGER NOT NULL,
            FOREIGN KEY (word_set_id) REFERENCES word_sets(id) ON DELETE CASCADE
        )",
        [],
    )?;

    Ok(())
}

// 初始化默认词汇集
pub fn init_default_word_sets(conn: &Connection) -> SqliteResult<()> {
    // 检查是否已有官方词库
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM word_sets WHERE is_official = 1",
        [],
        |row| row.get(0),
    )?;

    if count == 0 {
        // 插入第一个官方词库
        conn.execute(
            "INSERT INTO word_sets (name, is_official, created_at) VALUES (?1, 1, ?2)",
            params![
                "基础词汇 (50词)",
                chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string()
            ],
        )?;
        let set1_id = conn.last_insert_rowid() as i32;

        // 插入第一个词库的单词
        let words1 = [
            ("apple", "苹果", "I eat an apple every day."),
            ("beautiful", "美丽的", "She has a beautiful smile."),
            ("computer", "计算机", "My computer is very fast."),
            ("developer", "开发者", "He is a software developer."),
            ("experience", "经验", "I have 5 years of experience."),
            ("fantastic", "极好的", "This is a fantastic movie!"),
            ("github", "GitHub平台", "I host my code on GitHub."),
            ("hello", "你好", "Hello, how are you?"),
            ("internet", "互联网", "The internet connects the world."),
            (
                "javascript",
                "JavaScript编程语言",
                "JavaScript is used for web development.",
            ),
            ("knowledge", "知识", "Knowledge is power."),
            ("learning", "学习", "Learning is a lifelong process."),
            ("mountain", "山", "We climbed a high mountain."),
            ("network", "网络", "The network is down."),
            ("open source", "开源", "Linux is an open source project."),
            ("programming", "编程", "Programming is fun."),
            ("quality", "质量", "Quality is important."),
            (
                "react",
                "React框架",
                "React is a popular frontend framework.",
            ),
            ("software", "软件", "Software engineers write code."),
            ("technology", "技术", "Technology changes quickly."),
            ("unique", "独特的", "This is a unique opportunity."),
            ("virtual", "虚拟的", "Virtual reality is amazing."),
            ("website", "网站", "I built a website."),
            ("xenial", "友好的", "He has a xenial personality."),
            ("youtube", "YouTube视频平台", "I watch videos on YouTube."),
            ("zealous", "热情的", "She is a zealous worker."),
            ("algorithm", "算法", "This algorithm is efficient."),
            (
                "backend",
                "后端",
                "Backend development handles server logic.",
            ),
            ("cloud", "云", "Data is stored in the cloud."),
            (
                "database",
                "数据库",
                "The database stores user information.",
            ),
            ("frontend", "前端", "Frontend development deals with UI."),
            ("git", "Git版本控制", "Git helps manage code versions."),
            ("html", "HTML标记语言", "HTML structures web pages."),
            ("css", "CSS样式表", "CSS styles web pages."),
            (
                "typescript",
                "TypeScript编程语言",
                "TypeScript adds types to JavaScript.",
            ),
            (
                "python",
                "Python编程语言",
                "Python is great for data science.",
            ),
            (
                "java",
                "Java编程语言",
                "Java is used for Android development.",
            ),
            (
                "rust",
                "Rust编程语言",
                "Rust is a systems programming language.",
            ),
            ("go", "Go编程语言", "Go is known for concurrency."),
            (
                "swift",
                "Swift编程语言",
                "Swift is used for iOS development.",
            ),
            ("kotlin", "Kotlin编程语言", "Kotlin is modern and concise."),
            ("ruby", "Ruby编程语言", "Ruby is elegant and productive."),
            ("php", "PHP编程语言", "PHP powers many websites."),
            (
                "docker",
                "Docker容器平台",
                "Docker containerizes applications.",
            ),
            (
                "kubernetes",
                "Kubernetes编排平台",
                "Kubernetes orchestrates containers.",
            ),
            ("aws", "亚马逊云服务", "AWS is a popular cloud provider."),
            (
                "azure",
                "微软云平台",
                "Azure is Microsoft's cloud platform.",
            ),
            ("mongodb", "MongoDB数据库", "MongoDB is a NoSQL database."),
            (
                "postgresql",
                "PostgreSQL数据库",
                "PostgreSQL is a powerful relational database.",
            ),
            (
                "redis",
                "Redis缓存数据库",
                "Redis is an in-memory data store.",
            ),
        ];

        for (index, (word, meaning, example)) in words1.iter().enumerate() {
            conn.execute(
                "INSERT INTO word_set_items (word_set_id, word, meaning, example_sentence, order_index) VALUES (?1, ?2, ?3, ?4, ?5)",
                params![set1_id, word, meaning, example, index as i32],
            )?;
        }

        // 插入第二个官方词库
        conn.execute(
            "INSERT INTO word_sets (name, is_official, created_at) VALUES (?1, 1, ?2)",
            params![
                "编程术语 (40词)",
                chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string()
            ],
        )?;
        let set2_id = conn.last_insert_rowid() as i32;

        // 插入第二个词库的单词
        let words2 = [
            (
                "asynchronous",
                "异步的",
                "JavaScript is asynchronous by nature.",
            ),
            (
                "callback",
                "回调函数",
                "The callback function runs after the task completes.",
            ),
            (
                "closure",
                "闭包",
                "A closure captures variables from its outer scope.",
            ),
            (
                "compiler",
                "编译器",
                "The compiler translates code to machine language.",
            ),
            ("dependency", "依赖", "This project has many dependencies."),
            (
                "encapsulation",
                "封装",
                "Encapsulation hides implementation details.",
            ),
            ("framework", "框架", "React is a JavaScript framework."),
            (
                "functional",
                "函数式的",
                "Functional programming uses pure functions.",
            ),
            (
                "generics",
                "泛型",
                "Generics allow type-safe data structures.",
            ),
            ("immutable", "不可变的", "Strings in Java are immutable."),
            ("inheritance", "继承", "Inheritance allows code reuse."),
            ("interface", "接口", "An interface defines a contract."),
            (
                "lambda",
                "Lambda表达式",
                "Lambda expressions are concise functions.",
            ),
            (
                "middleware",
                "中间件",
                "Middleware processes requests in order.",
            ),
            (
                "namespace",
                "命名空间",
                "Namespaces prevent name conflicts.",
            ),
            (
                "optimization",
                "优化",
                "Code optimization improves performance.",
            ),
            (
                "polymorphism",
                "多态",
                "Polymorphism allows different types to be treated uniformly.",
            ),
            ("queue", "队列", "A queue processes items in FIFO order."),
            (
                "recursion",
                "递归",
                "Recursion solves problems by breaking them down.",
            ),
            (
                "singleton",
                "单例模式",
                "The singleton pattern ensures a single instance.",
            ),
            ("thread", "线程", "Multiple threads can run concurrently."),
            ("variable", "变量", "Variables store data in memory."),
            (
                "webpack",
                "Webpack打包工具",
                "Webpack bundles JavaScript files.",
            ),
            ("xml", "XML标记语言", "XML is used for data exchange."),
            (
                "yaml",
                "YAML数据格式",
                "YAML is human-readable data serialization.",
            ),
            ("zero", "零", "The array index starts at zero."),
            ("boolean", "布尔值", "A boolean can be true or false."),
            ("constant", "常量", "Constants cannot be reassigned."),
            ("debugger", "调试器", "The debugger helps find bugs."),
            (
                "event loop",
                "事件循环",
                "The event loop handles asynchronous operations.",
            ),
            (
                "factory",
                "工厂模式",
                "A factory creates objects without exposing logic.",
            ),
            (
                "garbage",
                "垃圾回收",
                "Garbage collection frees unused memory.",
            ),
            (
                "hoisting",
                "变量提升",
                "Hoisting moves declarations to the top.",
            ),
            ("iterator", "迭代器", "An iterator traverses collections."),
            ("json", "JSON数据格式", "JSON is commonly used for APIs."),
            (
                "keyword",
                "关键字",
                "Keywords are reserved in programming languages.",
            ),
            (
                "lexical",
                "词法的",
                "Lexical scoping determines variable visibility.",
            ),
            (
                "memoization",
                "记忆化",
                "Memoization caches function results.",
            ),
            ("nullable", "可空的", "Nullable types can hold null values."),
            ("object", "对象", "An object has properties and methods."),
        ];

        for (index, (word, meaning, example)) in words2.iter().enumerate() {
            conn.execute(
                "INSERT INTO word_set_items (word_set_id, word, meaning, example_sentence, order_index) VALUES (?1, ?2, ?3, ?4, ?5)",
                params![set2_id, word, meaning, example, index as i32],
            )?;
        }
    }

    Ok(())
}

// 初始化打字练习数据库
pub fn init_typing_database() -> Result<DbState, String> {
    let app_dir = get_app_data_dir();
    std::fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;
    let db_path = app_dir.join("typing_practice.db");
    println!("数据库路径: {}", db_path.display());

    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    init_typing_table(&conn).map_err(|e| e.to_string())?;
    init_default_word_sets(&conn).map_err(|e| e.to_string())?;

    Ok(DbState::new(conn))
}

pub fn init_typing_db_state() -> DbState {
    match init_typing_database() {
        Ok(state) => state,
        Err(e) => {
            eprintln!("Failed to initialize typing database: {}", e);
            // 使用内存数据库作为后备
            let conn = Connection::open_in_memory().unwrap();
            let _ = init_typing_table(&conn);
            let _ = init_default_word_sets(&conn);
            DbState::new(conn)
        }
    }
}

// 获取所有词汇集（包含单词和释义）
#[command]
pub async fn get_all_word_sets(
    state: tauri::State<'_, DbState>,
) -> Result<Vec<(WordSet, Vec<WordSetItem>)>, String> {
    let conn = state
        .conn
        .lock()
        .map_err(|e| format!("Failed to lock mutex: {}", e))?;

    // 获取所有词汇集
    let mut stmt = conn
        .prepare(
            "SELECT id, name, is_official, created_at FROM word_sets ORDER BY is_official DESC, created_at DESC",
        )
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;

    let word_sets = stmt
        .query_map([], |row| {
            Ok(WordSet {
                id: row.get(0)?,
                name: row.get(1)?,
                is_official: row.get::<_, i32>(2)? != 0,
                created_at: row.get(3)?,
            })
        })
        .map_err(|e| format!("Failed to query: {}", e))?;

    let mut result = Vec::new();

    for word_set in word_sets {
        let word_set = word_set.map_err(|e| format!("Failed to get row: {}", e))?;

        // 获取该词汇集的所有单词 - 修复：包含 example_sentence 字段
        let mut item_stmt = conn
            .prepare(
                "SELECT id, word_set_id, word, meaning, example_sentence, order_index FROM word_set_items 
                 WHERE word_set_id = ?1 ORDER BY order_index",
            )
            .map_err(|e| format!("Failed to prepare statement: {}", e))?;

        let items = item_stmt
            .query_map(params![word_set.id], |row| {
                Ok(WordSetItem {
                    id: row.get(0)?,
                    word_set_id: row.get(1)?,
                    word: row.get(2)?,
                    meaning: row.get(3)?,
                    example_sentence: row.get(4)?,
                    order_index: row.get(5)?,
                })
            })
            .map_err(|e| format!("Failed to query: {}", e))?;

        let mut item_list = Vec::new();
        for item in items {
            item_list.push(item.map_err(|e| format!("Failed to get row: {}", e))?);
        }

        result.push((word_set, item_list));
    }

    Ok(result)
}

// 获取单个词汇集
#[command]
pub async fn get_word_set(
    state: tauri::State<'_, DbState>,
    id: i32,
) -> Result<Option<(WordSet, Vec<WordSetItem>)>, String> {
    let conn = state
        .conn
        .lock()
        .map_err(|e| format!("Failed to lock mutex: {}", e))?;

    // 获取词汇集信息
    let mut stmt = conn
        .prepare("SELECT id, name, is_official, created_at FROM word_sets WHERE id = ?1")
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;

    let word_set_result = stmt.query_row(params![id], |row| {
        Ok(WordSet {
            id: row.get(0)?,
            name: row.get(1)?,
            is_official: row.get::<_, i32>(2)? != 0,
            created_at: row.get(3)?,
        })
    });

    match word_set_result {
        Ok(word_set) => {
            // 获取该词汇集的所有单词 - 修复：包含 example_sentence 字段
            let mut item_stmt = conn
                .prepare(
                    "SELECT id, word_set_id, word, meaning, example_sentence, order_index FROM word_set_items 
                     WHERE word_set_id = ?1 ORDER BY order_index",
                )
                .map_err(|e| format!("Failed to prepare statement: {}", e))?;

            let items = item_stmt
                .query_map(params![id], |row| {
                    Ok(WordSetItem {
                        id: row.get(0)?,
                        word_set_id: row.get(1)?,
                        word: row.get(2)?,
                        meaning: row.get(3)?,
                        example_sentence: row.get(4)?,
                        order_index: row.get(5)?,
                    })
                })
                .map_err(|e| format!("Failed to query: {}", e))?;

            let mut item_list = Vec::new();
            for item in items {
                item_list.push(item.map_err(|e| format!("Failed to get row: {}", e))?);
            }

            Ok(Some((word_set, item_list)))
        }
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(format!("Failed to query: {}", e)),
    }
}

// 保存自定义词汇集 - 修复：包含 example_sentence 字段
#[command]
pub async fn save_custom_word_set(
    state: tauri::State<'_, DbState>,
    name: String,
    words_with_meanings: String,
) -> Result<WordSet, String> {
    if name.trim().is_empty() {
        return Err("词汇集名称不能为空".to_string());
    }

    // 解析 JSON: [{"word": "hello", "meaning": "你好", "example_sentence": "..."}, ...]
    let items: Vec<serde_json::Value> =
        serde_json::from_str(&words_with_meanings).map_err(|e| format!("无效的数据格式: {}", e))?;

    if items.is_empty() {
        return Err("至少需要一个单词".to_string());
    }

    let created_at = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let mut conn = state
        .conn
        .lock()
        .map_err(|e| format!("Failed to lock mutex: {}", e))?;

    let transaction = conn
        .transaction()
        .map_err(|e| format!("Failed to start transaction: {}", e))?;

    // 插入词汇集
    transaction
        .execute(
            "INSERT INTO word_sets (name, is_official, created_at) VALUES (?1, 0, ?2)",
            params![name, created_at],
        )
        .map_err(|e| format!("Failed to insert word set: {}", e))?;

    let set_id = transaction.last_insert_rowid() as i32;

    // 插入单词 - 修复：包含 example_sentence 字段
    for (index, item) in items.iter().enumerate() {
        let word = item
            .get("word")
            .and_then(|v| v.as_str())
            .ok_or("单词字段缺失或无效")?
            .to_string();
        let meaning = item
            .get("meaning")
            .and_then(|v| v.as_str())
            .unwrap_or("暂无释义")
            .to_string();
        let example_sentence = item
            .get("example_sentence")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());

        transaction.execute(
            "INSERT INTO word_set_items (word_set_id, word, meaning, example_sentence, order_index) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![set_id, word, meaning, example_sentence, index as i32],
        ).map_err(|e| format!("Failed to insert word: {}", e))?;
    }

    transaction
        .commit()
        .map_err(|e| format!("Failed to commit: {}", e))?;

    Ok(WordSet {
        id: set_id,
        name,
        is_official: false,
        created_at,
    })
}

// 更新自定义词汇集 - 修复：包含 example_sentence 字段
#[command]
pub async fn update_custom_word_set(
    state: tauri::State<'_, DbState>,
    id: i32,
    name: String,
    words_with_meanings: String,
) -> Result<(), String> {
    if name.trim().is_empty() {
        return Err("词汇集名称不能为空".to_string());
    }

    // 先检查是否是官方词库
    let mut conn = state
        .conn
        .lock()
        .map_err(|e| format!("Failed to lock mutex: {}", e))?;

    let is_official: i32 = conn
        .query_row(
            "SELECT is_official FROM word_sets WHERE id = ?1",
            params![id],
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to check word set: {}", e))?;

    if is_official == 1 {
        return Err("不能修改官方词汇集".to_string());
    }

    // 解析 JSON
    let items: Vec<serde_json::Value> =
        serde_json::from_str(&words_with_meanings).map_err(|e| format!("无效的数据格式: {}", e))?;

    if items.is_empty() {
        return Err("至少需要一个单词".to_string());
    }

    let transaction = conn
        .transaction()
        .map_err(|e| format!("Failed to start transaction: {}", e))?;

    // 更新词汇集名称
    transaction
        .execute(
            "UPDATE word_sets SET name = ?1 WHERE id = ?2",
            params![name, id],
        )
        .map_err(|e| format!("Failed to update word set: {}", e))?;

    // 删除原有的单词
    transaction
        .execute(
            "DELETE FROM word_set_items WHERE word_set_id = ?1",
            params![id],
        )
        .map_err(|e| format!("Failed to delete old words: {}", e))?;

    // 插入新单词 - 修复：包含 example_sentence 字段
    for (index, item) in items.iter().enumerate() {
        let word = item
            .get("word")
            .and_then(|v| v.as_str())
            .ok_or("单词字段缺失或无效")?
            .to_string();
        let meaning = item
            .get("meaning")
            .and_then(|v| v.as_str())
            .unwrap_or("暂无释义")
            .to_string();
        let example_sentence = item
            .get("example_sentence")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());

        transaction.execute(
            "INSERT INTO word_set_items (word_set_id, word, meaning, example_sentence, order_index) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![id, word, meaning, example_sentence, index as i32],
        ).map_err(|e| format!("Failed to insert word: {}", e))?;
    }

    transaction
        .commit()
        .map_err(|e| format!("Failed to commit: {}", e))?;

    Ok(())
}

// 删除自定义词汇集
#[command]
pub async fn delete_custom_word_set(
    state: tauri::State<'_, DbState>,
    id: i32,
) -> Result<(), String> {
    let conn = state
        .conn
        .lock()
        .map_err(|e| format!("Failed to lock mutex: {}", e))?;

    // 先检查是否是官方词库
    let is_official: i32 = conn
        .query_row(
            "SELECT is_official FROM word_sets WHERE id = ?1",
            params![id],
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to check word set: {}", e))?;

    if is_official == 1 {
        return Err("不能删除官方词汇集".to_string());
    }

    // 由于设置了 ON DELETE CASCADE，删除词汇集时会自动删除相关的单词
    let affected = conn
        .execute("DELETE FROM word_sets WHERE id = ?1", params![id])
        .map_err(|e| format!("Failed to delete: {}", e))?;

    if affected == 0 {
        return Err("未找到指定的词汇集".to_string());
    }

    Ok(())
}

// 获取单个单词的释义和示例句子
#[command]
pub async fn get_word_meaning(
    state: tauri::State<'_, DbState>,
    word: String,
    word_set_id: Option<i32>,
) -> Result<String, String> {
    let conn = state
        .conn
        .lock()
        .map_err(|e| format!("Failed to lock mutex: {}", e))?;

    let meaning: Option<String> = if let Some(set_id) = word_set_id {
        // 如果指定了词汇集，优先从该词汇集中获取释义
        conn.query_row(
            "SELECT meaning FROM word_set_items WHERE word_set_id = ?1 AND word = ?2",
            params![set_id, word.to_lowercase()],
            |row| row.get(0),
        )
        .ok()
    } else {
        // 否则从任意词汇集获取（取第一个匹配的）
        conn.query_row(
            "SELECT meaning FROM word_set_items WHERE word = ?1 LIMIT 1",
            params![word.to_lowercase()],
            |row| row.get(0),
        )
        .ok()
    };

    Ok(meaning.unwrap_or_else(|| "暂无释义".to_string()))
}
