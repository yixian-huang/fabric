"""
邮件服务模块
提供统一的邮件发送功能
"""

from django.core.mail import send_mail, EmailMultiAlternatives
from django.template.loader import render_to_string, get_template
from django.conf import settings
from django.utils.html import strip_tags
import logging

logger = logging.getLogger(__name__)


class EmailService:
    """邮件服务类"""
    
    @staticmethod
    def send_verification_email(user, token):
        """
        发送邮箱验证邮件
        
        Args:
            user: 用户对象
            token: 验证令牌
            
        Returns:
            bool: 发送成功返回True，失败返回False
        """
        try:
            # 构建验证链接
            verification_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
            
            # 准备模板上下文数据
            context = {
                'user': user,
                'username': user.username,
                'verification_url': verification_url,
                'site_name': 'DAILY SILK FABRIC HUB',
                'expires_hours': 24
            }
            
            # 渲染邮件模板
            html_message = render_to_string('emails/verification_email.html', context)
            text_message = render_to_string('emails/verification_email.txt', context)
            
            subject = 'DAILY SILK FABRIC HUB - 邮箱验证'
            
            # 创建邮件对象（支持HTML和纯文本）
            email = EmailMultiAlternatives(
                subject=subject,
                body=text_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[user.email]
            )
            email.attach_alternative(html_message, "text/html")
            
            # 发送邮件
            email.send()
            
            logger.info(f"验证邮件已发送给用户 {user.username} ({user.email})")
            return True
            
        except Exception as e:
            logger.error(f"发送验证邮件失败: {str(e)}, 用户: {user.username}")
            return False
    
    @staticmethod
    def send_password_reset_email(user, token):
        """
        发送密码重置邮件
        
        Args:
            user: 用户对象
            token: 重置令牌
            
        Returns:
            bool: 发送成功返回True，失败返回False
        """
        try:
            # 构建重置链接
            reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
            
            # 准备模板上下文数据
            context = {
                'user': user,
                'username': user.username,
                'reset_url': reset_url,
                'site_name': 'DAILY SILK FABRIC HUB',
                'expires_hours': 1
            }
            
            # 渲染邮件模板
            html_message = render_to_string('emails/password_reset_email.html', context)
            text_message = render_to_string('emails/password_reset_email.txt', context)
            
            subject = 'DAILY SILK FABRIC HUB - 密码重置'
            
            # 创建邮件对象
            email = EmailMultiAlternatives(
                subject=subject,
                body=text_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[user.email]
            )
            email.attach_alternative(html_message, "text/html")
            
            # 发送邮件
            email.send()
            
            logger.info(f"密码重置邮件已发送给用户 {user.username} ({user.email})")
            return True
            
        except Exception as e:
            logger.error(f"发送密码重置邮件失败: {str(e)}, 用户: {user.username}")
            return False
    
    @staticmethod
    def send_fabric_update_notification(users, fabric_info):
        """
        发送面料更新通知邮件（群发）
        
        Args:
            users: 用户列表
            fabric_info: 面料信息
            
        Returns:
            dict: 发送结果统计
        """
        success_count = 0
        failed_count = 0
        
        for user in users:
            try:
                # 准备模板上下文数据
                context = {
                    'user': user,
                    'username': user.username,
                    'fabric_info': fabric_info,
                    'site_name': 'DAILY SILK FABRIC HUB',
                    'unsubscribe_url': f"{settings.FRONTEND_URL}/unsubscribe?token={user.user_id}"
                }
                
                # 渲染邮件模板
                html_message = render_to_string('emails/fabric_update_notification.html', context)
                text_message = render_to_string('emails/fabric_update_notification.txt', context)
                
                subject = 'DAILY SILK FABRIC HUB - 新面料上线通知'
                
                # 创建邮件对象
                email = EmailMultiAlternatives(
                    subject=subject,
                    body=text_message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    to=[user.email]
                )
                email.attach_alternative(html_message, "text/html")
                
                # 发送邮件
                email.send()
                success_count += 1
                
            except Exception as e:
                logger.error(f"发送面料更新通知邮件失败: {str(e)}, 用户: {user.username}")
                failed_count += 1
        
        logger.info(f"面料更新通知邮件发送完成: 成功 {success_count}, 失败 {failed_count}")
        return {
            'success_count': success_count,
            'failed_count': failed_count,
            'total_count': success_count + failed_count
        }
    
    @staticmethod
    def send_welcome_email(user):
        """
        发送欢迎邮件
        
        Args:
            user: 用户对象
            
        Returns:
            bool: 发送成功返回True，失败返回False
        """
        try:
            # 准备模板上下文数据
            context = {
                'user': user,
                'username': user.username,
                'site_name': 'DAILY SILK FABRIC HUB',
                'site_url': settings.FRONTEND_URL
            }
            
            # 渲染邮件模板
            html_message = render_to_string('emails/welcome_email.html', context)
            text_message = render_to_string('emails/welcome_email.txt', context)
            
            subject = 'DAILY SILK FABRIC HUB - 欢迎加入！'
            
            # 创建邮件对象
            email = EmailMultiAlternatives(
                subject=subject,
                body=text_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[user.email]
            )
            email.attach_alternative(html_message, "text/html")
            
            # 发送邮件
            email.send()
            
            logger.info(f"欢迎邮件已发送给用户 {user.username} ({user.email})")
            return True
            
        except Exception as e:
            logger.error(f"发送欢迎邮件失败: {str(e)}, 用户: {user.username}")
            return False


# 便利函数，提供简单的接口
def send_verification_email(user, token):
    """发送验证邮件的便利函数"""
    return EmailService.send_verification_email(user, token)


def send_password_reset_email(user, token):
    """发送密码重置邮件的便利函数"""
    return EmailService.send_password_reset_email(user, token)


def send_fabric_update_notification(users, fabric_info):
    """发送面料更新通知的便利函数"""
    return EmailService.send_fabric_update_notification(users, fabric_info)


def send_welcome_email(user):
    """发送欢迎邮件的便利函数"""
    return EmailService.send_welcome_email(user)
