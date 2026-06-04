from django.core.management.base import BaseCommand
from fabric.apps.fabrics.models import Component, Option, OptionCategory

class Command(BaseCommand):
    help = '将Component表中未映射的name字段添加到Option表中'

    def handle(self, *args, **kwargs):
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
        
        # 建议运行更新组件选项编码的命令
        self.stdout.write(self.style.WARNING(
            '提示: 现在可以运行 python manage.py update_component_option_codes 来更新组件的选项编码')) 