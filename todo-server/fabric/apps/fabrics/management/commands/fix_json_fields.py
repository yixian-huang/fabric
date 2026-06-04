#!/usr/bin/env python
# -*- coding: utf-8 -*-

import json
from django.core.management.base import BaseCommand
from fabric.apps.fabrics.models import Fabric

class Command(BaseCommand):
    help = '修复面料表中不合法的 JSON 格式字段 (process_codes 和 style_codes)'

    def handle(self, *args, **options):
        fabrics = Fabric.objects.all()
        update_count = 0
        error_count = 0

        self.stdout.write(self.style.SUCCESS(f'开始处理 {fabrics.count()} 个面料记录'))

        for fabric in fabrics:
            try:
                # 修复 process_codes 字段
                if fabric.process_codes:
                    # 如果已经是列表类型，不需要处理
                    if isinstance(fabric.process_codes, list):
                        pass
                    else:
                        # 尝试解析当前值
                        try:
                            # 如果是字符串类型的JSON，先解析
                            if isinstance(fabric.process_codes, str):
                                decoded_value = json.loads(fabric.process_codes)
                                # 确保得到的结果是列表类型
                                if isinstance(decoded_value, list):
                                    fabric.process_codes = decoded_value
                                else:
                                    fabric.process_codes = [decoded_value]
                        except json.JSONDecodeError:
                            # 解析失败，可能是字符串格式如 "[\"CRAFT007\"]"
                            # 去除引号和转义字符
                            try:
                                clean_str = fabric.process_codes.strip('"')
                                # 去除转义字符
                                clean_str = clean_str.replace('\\"', '"')
                                decoded_value = json.loads(clean_str)
                                fabric.process_codes = decoded_value
                            except Exception as e:
                                self.stdout.write(self.style.ERROR(f'无法解析 process_codes: {fabric.process_codes}, 错误: {str(e)}'))
                                error_count += 1
                                continue

                # 修复 style_codes 字段
                if fabric.style_codes:
                    # 如果已经是列表类型，不需要处理
                    if isinstance(fabric.style_codes, list):
                        pass
                    else:
                        # 尝试解析当前值
                        try:
                            # 如果是字符串类型的JSON，先解析
                            if isinstance(fabric.style_codes, str):
                                decoded_value = json.loads(fabric.style_codes)
                                # 确保得到的结果是列表类型
                                if isinstance(decoded_value, list):
                                    fabric.style_codes = decoded_value
                                else:
                                    fabric.style_codes = [decoded_value]
                        except json.JSONDecodeError:
                            # 解析失败，可能是字符串格式如 "[\"STYLE013\"]"
                            # 去除引号和转义字符
                            try:
                                clean_str = fabric.style_codes.strip('"')
                                # 去除转义字符
                                clean_str = clean_str.replace('\\"', '"')
                                decoded_value = json.loads(clean_str)
                                fabric.style_codes = decoded_value
                            except Exception as e:
                                self.stdout.write(self.style.ERROR(f'无法解析 style_codes: {fabric.style_codes}, 错误: {str(e)}'))
                                error_count += 1
                                continue

                # 保存更新后的记录
                fabric.save()
                update_count += 1
                if update_count % 100 == 0:
                    self.stdout.write(self.style.SUCCESS(f'已处理 {update_count} 条记录'))

            except Exception as e:
                self.stdout.write(self.style.ERROR(f'处理面料 ID: {fabric.fabric_id} 时出错: {str(e)}'))
                error_count += 1

        self.stdout.write(self.style.SUCCESS(f'处理完成！成功修复 {update_count} 条记录，失败 {error_count} 条记录。')) 