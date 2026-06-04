"""
发送面料更新通知邮件的管理命令
使用方法：python manage.py send_fabric_notifications --fabric-id <fabric_id>
"""

from django.core.management.base import BaseCommand, CommandError
from django.db.models import Q
from fabric.apps.base.models import User
from fabric.apps.fabrics.models import Fabric
from fabric.apps.base.services.email_service import send_fabric_update_notification
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = '发送面料更新通知邮件给订阅用户'

    def add_arguments(self, parser):
        parser.add_argument(
            '--fabric-id',
            type=str,
            help='要通知的面料ID',
            required=True
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='仅显示将要发送的邮件数量，不实际发送'
        )

    def handle(self, *args, **options):
        fabric_id = options['fabric_id']
        dry_run = options['dry_run']

        try:
            # 获取面料信息
            fabric = Fabric.objects.get(fabric_id=fabric_id)
        except Fabric.DoesNotExist:
            raise CommandError(f'面料 ID "{fabric_id}" 不存在')

        # 获取所有订阅邮件更新的已激活用户
        subscribers = User.objects.filter(
            Q(email_subscription=True) & 
            Q(email_verified=True) & 
            Q(status='active')
        )

        subscriber_count = subscribers.count()

        if subscriber_count == 0:
            self.stdout.write(
                self.style.WARNING('没有找到订阅用户，无需发送邮件')
            )
            return

        # 准备面料信息
        fabric_info = {
            'code': fabric.code,
            'reference_code': fabric.reference_code,
            'components': ', '.join([
                f"{comp.name} {comp.percentage}%"
                for comp in fabric.components.all()
            ]) if fabric.components.exists() else None,
            'weight': fabric.weight,
            'weight_unit': fabric.weight_unit,
            'width': fabric.width,
            'fabric_type': fabric.get_fabric_type_display(),
            'image_url': fabric.main_image.url if fabric.main_image else None,
        }

        if dry_run:
            self.stdout.write(
                self.style.SUCCESS(
                    f'[DRY RUN] 将向 {subscriber_count} 个订阅用户发送面料更新通知'
                )
            )
            self.stdout.write(f'面料信息: {fabric.code} - {fabric.reference_code}')
            return

        # 发送邮件
        self.stdout.write(f'开始向 {subscriber_count} 个用户发送面料更新通知...')
        
        result = send_fabric_update_notification(subscribers, fabric_info)
        
        success_count = result['success_count']
        failed_count = result['failed_count']
        total_count = result['total_count']

        if failed_count == 0:
            self.stdout.write(
                self.style.SUCCESS(
                    f'✅ 邮件发送完成！成功发送 {success_count}/{total_count} 封邮件'
                )
            )
        else:
            self.stdout.write(
                self.style.WARNING(
                    f'⚠️  邮件发送完成！成功 {success_count} 封，失败 {failed_count} 封，共 {total_count} 封'
                )
            )

        # 记录发送日志
        logger.info(
            f'面料更新通知邮件发送完成: 面料ID={fabric_id}, '
            f'成功={success_count}, 失败={failed_count}, 总计={total_count}'
        )
