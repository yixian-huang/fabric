import { useState, useCallback } from "react";
import { ShareInfo, VendorTag } from "../GridTypes";
import { parseVendorTags } from "../utils/vendorUtils";
import { createSharedLink, SharedLinkResponse } from "@/lib/projectService";
import { buildProjectShareUrl } from "@/lib/gridShareUtils";
import { toast } from "@/hooks/use-toast";
import { useProjectStore } from "@/store/projectStore";

/**
 * 处理分享功能相关的操作
 * @returns 分享相关的状态和方法
 */
export const useShareOperations = () => {
  const { projectId } = useProjectStore();
  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null);
  const [vendorLinks, setVendorLinks] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // 生成分享链接
  const generateShareLink = useCallback(async (rows: any[]) => {
    if (!projectId) {
      toast({
        title: "生成链接失败",
        description: "未找到项目ID",
        variant: "destructive"
      });
      throw new Error("未找到项目ID");
    }

    // 获取选中的行IDs
    const selectedRows = rows.filter(row => row.isSelected);
    if (selectedRows.length === 0) {
      toast({
        title: "请选择行",
        description: "请至少选择一行来生成共享链接",
        variant: "destructive"
      });
      throw new Error("未选择任何行");
    }

    // 检查每个选中的行是否都设置了供应商
    const rowsWithoutVendor: number[] = [];
    selectedRows.forEach((row, index) => {
      const vendorCell = row.cells.find((cell: any) => cell.type === 'vendor');
      let hasValidVendor = false;
      
      if (vendorCell && vendorCell.content) {
        try {
          const vendors = parseVendorTags(vendorCell);
          if (vendors && vendors.length > 0) {
            hasValidVendor = true;
          }
        } catch (error) {
          console.error("解析供应商数据失败:", error);
        }
      }
      
      if (!hasValidVendor) {
        rowsWithoutVendor.push(index + 1); // 行号从1开始显示更友好
      }
    });

    // 如果有未设置供应商的行，提示错误
    if (rowsWithoutVendor.length > 0) {
      const rowNumbers = rowsWithoutVendor.join(', ');
      toast({
        title: "无法创建共享链接",
        description: `第 ${rowNumbers} 行未设置供应商，请先设置供应商后再分享`,
        variant: "destructive"
      });
      throw new Error(`第 ${rowNumbers} 行未设置供应商`);
    }

    const selectedRowIds = selectedRows.map(row => row.id);
    setIsLoading(true);

    try {
      const newVendorLinks = new Map<string, string>();
      const allResponses: SharedLinkResponse[] = [];
      const origin = window.location.origin;

      // 为每个供应商创建共享链接
      const responses = await createSharedLink(projectId, selectedRowIds);
      allResponses.push(...responses);
      
      responses.forEach((response) => {
        if (response.vender) {
          newVendorLinks.set(
            response.vender,
            buildProjectShareUrl(
              origin,
              response.shared_key,
              response.shared_password,
              response.vender
            )
          );
        }
      });

      if (responses.length > 0) {
        const mainResponse = responses[0];
        setShareInfo({
          link: buildProjectShareUrl(
            origin,
            mainResponse.shared_key,
            mainResponse.shared_password,
            mainResponse.vender
          ),
          password: mainResponse.shared_password,
          selectedRows: selectedRowIds,
          expiresAt: new Date(new Date().getTime() + 24 * 60 * 60 * 1000),
          vendor: mainResponse.vender,
        });
      }
      
      setVendorLinks(newVendorLinks);
      
      toast({
        title: "共享链接已生成",
        description: `成功生成了 ${allResponses.length} 个共享链接`,
      });
    } catch (error) {
      console.error("创建共享链接失败:", error);
      toast({
        title: "创建共享链接失败",
        description: "请稍后重试",
        variant: "destructive"
      });
      throw error; // 重新抛出异常，让上层调用者知道出错了
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  // 清除分享信息
  const clearShareInfo = useCallback(() => {
    setShareInfo(null);
    setVendorLinks(new Map());
  }, []);

  return {
    shareInfo,
    vendorLinks,
    isLoading,
    setShareInfo,
    generateShareLink,
    clearShareInfo
  };
};
