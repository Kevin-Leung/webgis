# 导入第三方库
import pyodbc       # 用于连接SQL Server
import tkinter as tk        # 用于实现用户操作GUI
from tkinter import messagebox, ttk

# 设置默认的数据库连接参数，就不用每次都填写了
default_server = 'localhost,4116'       # 在SQL Server配置管理器里面设置
default_username = 'user'               # 在SSMS里面配置用户名和密码
default_password = 'Aa123456'
default_database = 'iTems'              # 指定连接的数据库


# 获取数据库连接信息
def get_connection_info():
    server = default_server
    username = default_username
    password = default_password
    database = default_database

    def submit():
        nonlocal server, username, password, database
        server = server_entry.get() or default_server
        username = username_entry.get() or default_username
        password = password_entry.get() or default_password
        database = database_entry.get() or default_database
        login_window.destroy()

    login_window = tk.Tk()
    login_window.title("物品管理系统 | 登录")

    tk.Label(login_window, text="服务器地址和端口:").grid(row=0, column=0, padx=10, pady=5, sticky='e')
    server_entry = tk.Entry(login_window)
    server_entry.insert(0, default_server)
    server_entry.grid(row=0, column=1, padx=10, pady=5)

    tk.Label(login_window, text="用户名:").grid(row=1, column=0, padx=10, pady=5, sticky='e')
    username_entry = tk.Entry(login_window)
    username_entry.insert(0, default_username)
    username_entry.grid(row=1, column=1, padx=10, pady=5)

    tk.Label(login_window, text="密码:").grid(row=2, column=0, padx=10, pady=5, sticky='e')
    password_entry = tk.Entry(login_window, show='*')
    password_entry.insert(0, default_password)
    password_entry.grid(row=2, column=1, padx=10, pady=5)

    tk.Label(login_window, text="数据库名称:").grid(row=3, column=0, padx=10, pady=5, sticky='e')
    database_entry = tk.Entry(login_window)
    database_entry.insert(0, default_database)
    database_entry.grid(row=3, column=1, padx=10, pady=5)

    tk.Button(login_window, text="登录", command=submit).grid(row=4, columnspan=2, pady=10)

    login_window.mainloop()

    return server, username, password, database


# 创建数据库连接
def connect_to_database(server, username, password, database):
    try:
        connection = pyodbc.connect(
            f'DRIVER={{SQL Server}};SERVER={server};DATABASE={database};UID={username};PWD={password}'
        )
        return connection
    except Exception as e:
        messagebox.showerror("连接错误", f"无法连接到数据库: {e}")
        return None


# 刷新数据表
def refresh_table(connection, tree):
    for row in tree.get_children():
        tree.delete(row)

    try:
        cursor = connection.cursor()
        query = "SELECT * FROM items"
        rows = cursor.execute(query).fetchall()
        for row in rows:
            values = [str(item) if item is not None else "(空)" for item in row]
            tree.insert("", "end", values=values)
    except Exception as e:
        messagebox.showerror("错误", f"加载数据时出错: {e}")


# 添加物品到数据库
def add_item(connection, tree):
    def submit():
        name = name_entry.get()
        location = location_entry.get()
        purchase_date = purchase_date_entry.get()
        expiry_date = expiry_date_entry.get() or None  # 空值时使用 None

        try:
            cursor = connection.cursor()
            query = "INSERT INTO items (name, location, purchase_date, expiry_date) VALUES (?, ?, ?, ?)"
            cursor.execute(query, (name, location, purchase_date, expiry_date))
            connection.commit()
            messagebox.showinfo("成功", "物品已成功添加!")
            add_window.destroy()
            refresh_table(connection, tree)
        except Exception as e:
            messagebox.showerror("错误", f"添加物品时出错: {e}")

    add_window = tk.Tk()
    add_window.title("添加物品")

    tk.Label(add_window, text="物品名称:").grid(row=0, column=0, padx=10, pady=5, sticky='e')
    name_entry = tk.Entry(add_window)
    name_entry.grid(row=0, column=1, padx=10, pady=5)

    tk.Label(add_window, text="存放位置:").grid(row=1, column=0, padx=10, pady=5, sticky='e')
    location_entry = tk.Entry(add_window)
    location_entry.grid(row=1, column=1, padx=10, pady=5)

    tk.Label(add_window, text="购买日期 (YYYY-MM-DD):").grid(row=2, column=0, padx=10, pady=5, sticky='e')
    purchase_date_entry = tk.Entry(add_window)
    purchase_date_entry.grid(row=2, column=1, padx=10, pady=5)

    tk.Label(add_window, text="过期日期 (YYYY-MM-DD):").grid(row=3, column=0, padx=10, pady=5, sticky='e')
    expiry_date_entry = tk.Entry(add_window)
    expiry_date_entry.grid(row=3, column=1, padx=10, pady=5)

    tk.Button(add_window, text="提交", command=submit).grid(row=4, columnspan=2, pady=10)

    add_window.mainloop()


# 删除物品
def delete_item(connection, tree):
    def submit():
        item_id = id_entry.get()
        try:
            cursor = connection.cursor()
            query = "DELETE FROM items WHERE id = ?"
            cursor.execute(query, (item_id,))
            connection.commit()
            messagebox.showinfo("成功", "物品已删除!")
            delete_window.destroy()
            refresh_table(connection, tree)
        except Exception as e:
            messagebox.showerror("错误", f"删除物品时出错: {e}")

    delete_window = tk.Tk()
    delete_window.title("删除物品")

    tk.Label(delete_window, text="物品ID:").grid(row=0, column=0, padx=10, pady=5, sticky='e')
    id_entry = tk.Entry(delete_window)
    id_entry.grid(row=0, column=1, padx=10, pady=5)

    tk.Button(delete_window, text="提交", command=submit).grid(row=1, columnspan=2, pady=10)

    delete_window.mainloop()


# 查看过期物品
def show_expired_items(connection):
    expired_window = tk.Tk()
    expired_window.title("物品管理系统 | 过期物品")

    tree = ttk.Treeview(expired_window, columns=("id", "name", "location", "purchase_date", "expiry_date", "moved_to_expired_on"), show="headings")
    tree.heading("id", text="ID")
    tree.heading("name", text="名称")
    tree.heading("location", text="存放位置")
    tree.heading("purchase_date", text="购买日期")
    tree.heading("expiry_date", text="过期日期")
    tree.heading("moved_to_expired_on", text="已经过期（天）")

    tree.pack(fill=tk.BOTH, expand=True)

    try:
        cursor = connection.cursor()
        query = "SELECT * FROM expired"
        rows = cursor.execute(query).fetchall()
        for row in rows:
            tree.insert("", "end", values=[str(item) for item in row])
    except Exception as e:
        messagebox.showerror("错误", f"加载过期物品时出错: {e}")


# 主用户界面
def main():
    server, username, password, database = get_connection_info()
    connection = connect_to_database(server, username, password, database)
    if not connection:
        return

    root = tk.Tk()
    root.title("物品管理系统")

    tree = ttk.Treeview(root, columns=("id", "name", "location", "purchase_date", "expiry_date"), show="headings")
    tree.heading("id", text="ID")
    tree.heading("name", text="名称")
    tree.heading("location", text="存放位置")
    tree.heading("purchase_date", text="购买日期")
    tree.heading("expiry_date", text="过期日期")

    tree.pack(fill=tk.BOTH, expand=True)

    refresh_table(connection, tree)

    btn_frame = tk.Frame(root)
    btn_frame.pack(pady=10)

    tk.Button(btn_frame, text="添加物品", command=lambda: add_item(connection, tree), width=20).pack(side=tk.LEFT, padx=5)
    tk.Button(btn_frame, text="删除物品", command=lambda: delete_item(connection, tree), width=20).pack(side=tk.LEFT, padx=5)
    tk.Button(btn_frame, text="查看过期物品", command=lambda: show_expired_items(connection), width=20).pack(side=tk.LEFT, padx=5)
    tk.Button(btn_frame, text="退出", command=root.destroy, width=20).pack(side=tk.LEFT, padx=5)

    root.mainloop()


if __name__ == "__main__":
    main()