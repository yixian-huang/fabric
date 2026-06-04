from django.core.management.base import BaseCommand
from fabric.apps.fabrics.models import Component, Option, OptionCategory
from django.db import transaction

class Command(BaseCommand):
    help = '综合命令：先添加缺失的选项，然后更新所有组件的option_code'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.SUCCESS('===== 开始处理选项编码更新 ====='))
        
        # 第一步：添加缺失的选项
        self.add_missing_options()
        
        # 第二步：更新组件的option_code
        self.update_component_option_codes()
        
        self.stdout.write(self.style.SUCCESS('===== 选项编码更新处理完成 ====='))
    
    def add_missing_options(self):
        """添加缺失的选项到Option表"""
        self.stdout.write(self.style.SUCCESS('\n第一步：添加缺失的成分选项'))
        
        # 获取所有现有的成分选项名称
        existing_options = Option.objects.filter(
            category_code=OptionCategory.COMPONENT
        ).values_list('option_name', flat=True)
        existing_options = list(existing_options)
        
        # 获取所有已使用但未添加到选项表的成分名称
        all_component_names = Component.objects.values_list('name', flat=True).distinct()
        missing_names = set()
        for name in all_component_names:
            if name and name not in existing_options:
                missing_names.add(name)
        
        # 显示找到的缺失选项
        self.stdout.write(self.style.SUCCESS(f'找到 {len(missing_names)} 个缺失的成分选项'))
        
        if not missing_names:
            self.stdout.write(self.style.SUCCESS('没有缺失的选项，无需添加'))
            return
            
        # 获取已有选项的最大序号
        last_option = Option.objects.filter(
            category_code=OptionCategory.COMPONENT,
            option_code__startswith='COMP'
        ).order_by('option_code').last()
        
        if last_option:
            try:
                last_code = last_option.option_code
                last_num = int(last_code.replace('COMP', ''))
                start_num = last_num + 1
            except (ValueError, AttributeError):
                start_num = 1
        else:
            start_num = 1
            
        # 添加缺失的选项
        added_count = 0
        with transaction.atomic():
            for i, name in enumerate(sorted(missing_names)):
                option_code = f'COMP{start_num + i:03d}'
                Option.objects.create(
                    category_code=OptionCategory.COMPONENT,
                    option_code=option_code,
                    option_name=name
                )
                self.stdout.write(f"  - 已添加: {name} -> {option_code}")
                added_count += 1
            
        # 输出统计信息
        self.stdout.write(self.style.SUCCESS(f'处理完成! 添加了 {added_count} 个成分选项'))
    
    def update_component_option_codes(self):
        """更新所有组件的option_code字段"""
        self.stdout.write(self.style.SUCCESS('\n第二步：更新Component表的option_code字段'))
        
        # 获取所有成分选项，建立名称到编码的映射
        component_options = Option.objects.filter(category_code=OptionCategory.COMPONENT)
        option_map = {option.option_name: option.option_code for option in component_options}
        
        # 显示找到的选项映射
        self.stdout.write(self.style.SUCCESS(f'找到 {len(option_map)} 个成分选项映射'))
        
        # 获取所有组件记录
        components = Component.objects.all()
        total_count = components.count()
        updated_count = 0
        skipped_count = 0
        missing_count = 0
        missing_names = set()
        
        # 批量更新组件的option_code
        with transaction.atomic():
            for component in components:
                # 如果已经有option_code，则跳过
                if component.option_code:
                    skipped_count += 1
                    continue
                    
                # 查找对应的选项代码
                if component.name in option_map:
                    component.option_code = option_map[component.name]
                    component.save(update_fields=['option_code'])
                    updated_count += 1
                else:
                    missing_count += 1
                    missing_names.add(component.name)
        
        # 输出统计信息
        self.stdout.write(self.style.SUCCESS(f'处理完成! 总组件数: {total_count}'))
        self.stdout.write(self.style.SUCCESS(f'  - 已更新: {updated_count}'))
        self.stdout.write(self.style.SUCCESS(f'  - 已跳过(已有编码): {skipped_count}'))
        self.stdout.write(self.style.SUCCESS(f'  - 未找到对应选项: {missing_count}'))
        
        # 如果有未找到对应选项的名称，输出它们
        if missing_names:
            self.stdout.write(self.style.WARNING('以下成分名称未找到对应选项(这是异常情况，因为我们已经添加了缺失的选项):'))
            for name in missing_names:
                self.stdout.write(f"  - {name}")
            
            # 提供建议
            self.stdout.write(self.style.WARNING(
                '可能的原因：添加缺失选项后，有新的组件被添加。建议重新运行此命令')) 