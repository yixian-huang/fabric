from django.core.management.base import BaseCommand
from fabric.apps.fabrics.models import Fabric, Option, OptionCategory
from django.db import transaction
import json

class Command(BaseCommand):
    help = '将Fabric表中的style和process字段从名称转换为对应的option_code，存储为JSON数组'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.SUCCESS('===== 开始处理面料风格和工艺选项编码 ====='))
        
        # 处理风格选项
        self.update_fabric_field(OptionCategory.FABRIC_STYLE, 'style')
        
        # 处理工艺选项
        self.update_fabric_field(OptionCategory.CRAFT, 'process')
        
        self.stdout.write(self.style.SUCCESS('===== 处理完成 ====='))
    
    def update_fabric_field(self, category_code, field_name):
        """更新Fabric表中指定字段的值为对应的option_code数组"""
        self.stdout.write(self.style.SUCCESS(f'\n处理 {field_name} 字段 (类别: {category_code}):'))
        
        # 获取该类别下的所有选项
        options = Option.objects.filter(category_code=category_code)
        option_map = {option.option_name: option.option_code for option in options}
        
        self.stdout.write(self.style.SUCCESS(f'找到 {len(option_map)} 个{category_code}选项映射'))
        
        # 获取所有面料记录
        fabrics = Fabric.objects.all()
        total_count = fabrics.count()
        updated_count = 0
        skipped_count = 0
        missing_items = []
        
        # 处理每个面料记录
        with transaction.atomic():
            for fabric in fabrics:
                # 获取当前字段的值
                current_value = getattr(fabric, field_name)
                if not current_value:
                    skipped_count += 1
                    continue
                
                # 将逗号分隔的字符串转换为列表
                name_list = current_value.split(',')
                if not name_list:
                    skipped_count += 1
                    continue
                
                # 转换为option_code列表
                code_list = []
                all_found = True
                
                for name in name_list:
                    name = name.strip()
                    if not name:
                        continue
                        
                    if name in option_map:
                        code_list.append(option_map[name])
                    else:
                        all_found = False
                        missing_items.append({
                            'fabric_id': str(fabric.fabric_id),
                            'field': field_name,
                            'missing_name': name
                        })
                
                # 如果所有名称都找到了对应的option_code，则更新
                if code_list and all_found:
                    # 将option_code列表转换为JSON数组存储
                    setattr(fabric, f'{field_name}_codes', json.dumps(code_list))
                    fabric.save(update_fields=[f'{field_name}_codes'])
                    updated_count += 1
                elif not all_found:
                    self.stdout.write(self.style.WARNING(
                        f'Fabric {fabric.fabric_id} 的 {field_name} 字段有未找到对应选项的值: {current_value}'))
                else:
                    skipped_count += 1
        
        # 输出统计信息
        self.stdout.write(self.style.SUCCESS(f'处理完成! 总面料数: {total_count}'))
        self.stdout.write(self.style.SUCCESS(f'  - 已更新: {updated_count}'))
        self.stdout.write(self.style.SUCCESS(f'  - 已跳过: {skipped_count}'))
        self.stdout.write(self.style.SUCCESS(f'  - 未找到对应选项: {len(missing_items)}'))
        
        # 输出未找到对应选项的详细信息
        if missing_items:
            self.stdout.write(self.style.WARNING('以下面料有未找到对应选项的值:'))
            for item in missing_items:
                self.stdout.write(f"  - Fabric {item['fabric_id']}, 字段: {item['field']}, 值: {item['missing_name']}")
        
        # 提供添加缺失选项的建议
        if missing_items:
            # 提取所有缺失的选项名称
            missing_names = set(item['missing_name'] for item in missing_items)
            
            self.stdout.write(self.style.WARNING('建议添加以下选项到Option表:'))
            for name in sorted(missing_names):
                self.stdout.write(f"  - {name}")
            
            # 提供添加选项的命令示例
            category_name = "FABRIC_STYLE" if category_code == OptionCategory.FABRIC_STYLE else "CRAFT"
            code_prefix = "STYLE" if category_code == OptionCategory.FABRIC_STYLE else "CRAFT"
            
            self.stdout.write(self.style.WARNING(f'可以使用以下Python代码添加缺失的选项:'))
            self.stdout.write("""
from fabric.apps.fabrics.models import Option, OptionCategory

# 获取最新的序号
last_option = Option.objects.filter(
    category_code=OptionCategory.{category},
    option_code__startswith='{prefix}'
).order_by('option_code').last()

if last_option:
    last_num = int(last_option.option_code.replace('{prefix}', ''))
    start_num = last_num 1
else:
    start_num = 1

# 添加缺失的选项
missing_names = {missing_names}
for i, name in enumerate(sorted(missing_names)):
    option_code = f'{prefix}{{start_num i:03d}}'
    Option.objects.create(
        category_code=OptionCategory.{category},
        option_code=option_code,
        option_name=name
    )
    print(f"已添加: {{name}} -> {{option_code}}")
""".format(
                category=category_name,
                prefix=code_prefix,
                missing_names=repr(sorted(missing_names))
            ))
            
            self.stdout.write(self.style.WARNING('添加完缺失的选项后，请重新运行此命令')) 
