from django.core.management.base import BaseCommand
from fabric.apps.fabrics.models import Option, OptionCategory

class Command(BaseCommand):
    help = '添加更多的面料成分选项到数据库'

    def handle(self, *args, **kwargs):
        # 要添加的新成分选项
        new_components = [
            ("SILK", "丝"),
            ("LEINEN", "亚麻"),
            ("LYOCELL", "莱赛尔"),
            ("CUPRO", "铜氨"),
            ("LUREX", "金属"),
            ("POLYAMIDE/NYLON", "锦纶"),
            ("ACETATE", "醋酯"),
            ("ACRYLIC", "腈纶"),
            ("ALPACA", "羊驼毛"),
            ("CASHMERE", "山羊绒"),
            ("KAPOK", "木棉"),
            ("TRUE HEMP", "大麻"),
            ("ELASTOMULTIESTER", "弹性多聚酯"),
            ("JUTE", "黄麻"),
            ("MODAL", "莫代尔"),
            ("POLYURETHANE", "聚氨酯"),
            ("RAMIE", "苎麻纤维"),
            ("SISAL", "剑麻")
        ]
        
        added_count = 0
        skipped_count = 0
        
        for option_code, option_name in new_components:
            # 检查选项是否已存在
            if Option.objects.filter(option_code=option_code).exists():
                self.stdout.write(f"跳过已存在的选项: {option_code} - {option_name}")
                skipped_count += 1
                continue
                
            # 创建新选项
            Option.objects.create(
                category_code=OptionCategory.COMPONENT,
                option_code=option_code,
                option_name=option_name
            )
            self.stdout.write(self.style.SUCCESS(f"已添加选项: {option_code} - {option_name}"))
            added_count += 1
        
        # 输出统计信息
        self.stdout.write(self.style.SUCCESS(f"处理完成! 共添加 {added_count} 个选项，跳过 {skipped_count} 个已存在选项")) 