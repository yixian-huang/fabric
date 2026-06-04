from django.core.management.base import BaseCommand
from fabric.apps.fabrics.models import Option, OptionCategory

class Command(BaseCommand):
    help = '创建成分、工艺、布面风格等选项数据'

    def handle(self, *args, **kwargs):
        # 成分选项数据
        component_options = [
            "棉", "人棉", "化纤", "天丝", "人丝", "全棉", "麻", 
            "羊毛", "真丝", "尼龙", "涤纶", "氨纶", "其他"
        ]
        
        # 工艺选项数据
        craft_options = [
            "素色", "水印", "数码印", "色织", "绣花", "订珠", 
            "染色", "烫金", "压花", "其他"
        ]
        
        # 布面风格选项数据
        fabric_style_options = [
            "CDC", "SATIN", "CREPE", "TWILL", "POPLIN", "CHIFFON", "CREPON", "VOILE",
            "PLAIN", "HERRINGBONE", "DOBBY", "SLUB", "JACQUARD", "CRINKLE", "CANVANS", "OXFORD"
        ]
        
        # 先清理旧数据（可选）
        Option.objects.all().delete()
        self.stdout.write(self.style.SUCCESS('已清理旧的选项数据'))
        
        # 创建成分选项
        for i, name in enumerate(component_options):
            Option.objects.create(
                category_code=OptionCategory.COMPONENT,
                option_code=f'COMP{i+1:03d}',
                option_name=name
            )
        self.stdout.write(self.style.SUCCESS(f'成功创建 {len(component_options)} 个成分选项'))
        
        # 创建工艺选项
        for i, name in enumerate(craft_options):
            Option.objects.create(
                category_code=OptionCategory.CRAFT,
                option_code=f'CRAFT{i+1:03d}',
                option_name=name
            )
        self.stdout.write(self.style.SUCCESS(f'成功创建 {len(craft_options)} 个工艺选项'))
        
        # 创建布面风格选项
        for i, name in enumerate(fabric_style_options):
            Option.objects.create(
                category_code=OptionCategory.FABRIC_STYLE,
                option_code=f'STYLE{i+1:03d}',
                option_name=name
            )
        self.stdout.write(self.style.SUCCESS(f'成功创建 {len(fabric_style_options)} 个布面风格选项'))
        
        total = len(component_options) + len(craft_options) + len(fabric_style_options)
        self.stdout.write(self.style.SUCCESS(f'成功创建总计 {total} 个选项数据')) 