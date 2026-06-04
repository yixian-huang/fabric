package grid

type defaultColumn struct {
	Title string
	Width int
	Type  string
}

// defaultGridColumns mirrors Django GridProject.create_default_columns.
var defaultGridColumns = []defaultColumn{
	{Title: "序号", Width: 80, Type: "text"},
	{Title: "客户", Width: 150, Type: "text"},
	{Title: "成衣款号", Width: 150, Type: "text"},
	{Title: "样式图", Width: 150, Type: "image"},
	{Title: "供应商", Width: 150, Type: "vendor"},
	{Title: "文件", Width: 200, Type: "file"},
	{Title: "单价", Width: 100, Type: "text"},
	{Title: "主面料", Width: 100, Type: "text"},
	{Title: "主辅料", Width: 100, Type: "text"},
	{Title: "事宜", Width: 150, Type: "text"},
	{Title: "完成日期", Width: 150, Type: "date"},
	{Title: "备注", Width: 200, Type: "vendorNote"},
}

var defaultTodoColumns = []defaultColumn{
	{Title: "待办事项", Width: 200, Type: "text"},
	{Title: "截止日期", Width: 150, Type: "date"},
	{Title: "状态", Width: 100, Type: "text"},
}

const userConfigKeyTodoID = "todo_id"
