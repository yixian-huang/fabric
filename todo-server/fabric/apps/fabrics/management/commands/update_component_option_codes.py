from django.core.management.base import BaseCommand
from fabric.apps.fabrics.models import Component, Option, OptionCategory

class Command(BaseCommand):
    help = '根据Component表中的name字段补全option_code字段'

    def handle(self, *args, **kwargs):
        # 获取所有成分选项，建立名称到编码的映射
        component_options = Option.objects.filter(category_code=OptionCategory.COMPONENT)
        option_map = {option.option_name: option.option_code for option in component_options}
        
        # 显示找到的选项映射
        self.stdout.write(self.style.SUCCESS(f'找到 {len(option_map)} 个成分选项映射'))
        for name, code in option_map.items():
            self.stdout.write(f"  - {name}: {code}")
        
        # 获取所有组件记录
        components = Component.objects.all()
        total_count = components.count()
        updated_count = 0
        skipped_count = 0
        missing_count = 0
        missing_names = set()
        
        # 更新每个组件的option_code
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
            self.stdout.write(self.style.WARNING('以下成分名称未找到对应选项:'))
            for name in missing_names:
                self.stdout.write(f"  - {name}")
            
            # 提供建议
            self.stdout.write(self.style.WARNING(
                '建议: 运行 python manage.py create_options 添加这些选项，'
                '或修改这些成分的名称以匹配现有选项')) 