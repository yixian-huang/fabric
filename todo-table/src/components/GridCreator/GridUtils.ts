
import { nanoid } from "nanoid";
import { GridColumn, GridRow } from "./GridTypes";

// 默认列
export const defaultColumns: GridColumn[] = [
  { id: nanoid(), title: "序号", width: 80 },
  { id: nanoid(), title: "客户", width: 150 },
  { id: nanoid(), title: "成衣款号", width: 150 },
  { id: nanoid(), title: "样式图", width: 150, type: "image" },
  { id: nanoid(), title: "供应商", width: 150, type: "vendor" },
  { id: nanoid(), title: "文件", width: 200, type: "file" },
  { id: nanoid(), title: "单价", width: 100 },
  { id: nanoid(), title: "主面料", width: 100 },
  { id: nanoid(), title: "主辅料", width: 100 },
  { id: nanoid(), title: "事宜", width: 150 },
  { id: nanoid(), title: "完成日期", width: 150, type: "date" },
  { id: nanoid(), title: "备注", width: 200, type: "vendorNote" },
];

// 生成空行
export const createEmptyRow = (columns: GridColumn[]): GridRow => ({
  id: nanoid(),
  cells: columns.map(col => ({
    id: nanoid(),
    content: "",
    type: col.type || "text"
  })),
  isSelected: false
});

// 生成示例行数据
export const createSampleRows = (columns: GridColumn[]): GridRow[] => {
  const sampleData = [
    {
      id: "1",
      data: ["1", "SCR", "TICHIA", "", "HS", "TICHIA P1", "加工费 48 元", "K1189-KH", "YKK 2#隐拉", "打二次样", "2025/04/10"]
    },
    {
      id: "1.1",
      data: ["1.1", "SCR", "TICHIA", "", "KH", "", "单价 17 元每米", "K1189-KH", "", "打ABC色样", "2025/04/08"]
    },
    {
      id: "1.2", 
      data: ["1.2", "SCR", "TICHIA", "", "YKK", "", "", "", "YKK 2#隐拉", "配绿色色样", "2025/04/03"]
    },
    {
      id: "1.3",
      data: ["1.3", "SCR", "TICHIA", "", "NT", "", "", "100%TENCEL 90gsm", "", "找相同的面料", "2025/04/08"]
    },
    {
      id: "2",
      data: ["2", "TD", "CHARIL", "", "HSD", "", "", "K1834-KH", "4H-BTN-P", "打头样", "2025/04/12"]
    },
    {
      id: "2.1",
      data: ["2.1", "TD", "CHARIL", "", "KH", "", "单价 18 元每米", "1834-KH", "", "安原样色确认 放样 50 米", "2025/04/12"]
    }
  ];
  return sampleData.map(item => {
    const row: GridRow = {
      id: nanoid(),
      cells: columns.map((col, index) => {
        const content = index < item.data.length ? item.data[index] : "";
        
        // Convert date strings in date column
        if (col.type === "date" && typeof content === "string" && content) {
          try {
            return {
              id: nanoid(),
              content: new Date(content),
              type: col.type,
              style: {}
            };
          } catch (e) {
            return {
              id: nanoid(),
              content,
              type: col.type,
              style: {}
            };
          }
        }
        
        return {
          id: nanoid(),
          content,
          type: col.type || "text",
          style: {}
        };
      }),
      isSelected: false
    };
    if (item.id === "1.3") row.cells[9].style = { backgroundColor: "#FEC6A1" };
    if (item.id === "2.1") row.cells[9].style = { backgroundColor: "#F2FCE2" };
    return row;
  });
};

export const createInitialRows = (columns: GridColumn[]): GridRow[] => {
  return createSampleRows(columns);
};
