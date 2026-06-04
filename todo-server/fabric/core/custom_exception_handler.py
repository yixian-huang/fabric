# my_project/core/exception_handlers.py

from rest_framework.views import exception_handler as drf_exception_handler # 导入DRF默认的处理器
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import APIException, ValidationError, ErrorDetail # 常见异常
from django.http import Http404 # Django 的 404
from django.conf import settings

# (可选) 引入你之前实现的错误扁平化函数
# from .utils import _flatten_drf_errors # 假设 _flatten_drf_errors 在同目录的 utils.py

# 你也可以直接在这里定义 _flatten_drf_errors，如果它只用于此处
def _flatten_drf_errors(error_detail, parent_key=''):
    items = []
    if isinstance(error_detail, dict):
        for field, value in error_detail.items():
            current_key = f"{parent_key}.{field}" if parent_key else field
            if isinstance(value, dict):
                items.extend(_flatten_drf_errors(value, current_key))
            elif isinstance(value, list):
                is_list_items_error = False
                if value and any(isinstance(item, dict) for item in value):
                    is_list_items_error = True

                if is_list_items_error:
                    for index, item_errors in enumerate(value):
                        if isinstance(item_errors, dict) and item_errors:
                            indexed_key = f"{current_key}[{index}]"
                            items.extend(_flatten_drf_errors(item_errors, indexed_key))
                        elif isinstance(item_errors, (list, ErrorDetail)):
                            item_message = str(item_errors[0] if isinstance(item_errors, list) and item_errors else item_errors)
                            items.append({"field": f"{current_key}[{index}]", "message": item_message})
                else:
                    for error in value:
                        items.append({"field": current_key, "message": str(error)})
            elif isinstance(value, ErrorDetail):
                items.append({"field": current_key, "message": str(value)})
    elif isinstance(error_detail, list):
        field_name = parent_key if parent_key else "non_field_errors"
        for error in error_detail:
            items.append({"field": field_name, "message": str(error)})
    return items


def custom_api_exception_handler(exc, context):
    # 首先，调用DRF自己的默认异常处理器，
    # 这样我们可以利用它对标准DRF异常（如NotAuthenticated, PermissionDenied等）的处理
    response = drf_exception_handler(exc, context)

    # `response` 在这里可能是:
    # 1. DRF成功处理了异常，返回了一个Response对象 (例如 ValidationError, NotAuthenticated)
    # 2. DRF不能处理该异常 (例如 Django Http404 或 Python 内置错误), 返回 None

    if response is not None:
        # DRF 已经为我们处理了，现在我们可以定制 `response.data` 的结构
        # 原始的 response.data 通常是 {'detail': '错误信息'} 或 字段错误字典

        custom_response_data = {
            'code': response.status_code, # 使用HTTP状态码作为业务状态码，或定义你自己的
            'message': '操作出错', # 通用消息，可以根据异常类型覆盖
            'errors': None, # 详细错误，可以根据异常类型填充
            'data': None # 成功时的数据字段，出错时为None
        }

        if isinstance(exc, ValidationError):
            custom_response_data['message'] = '数据验证失败'
            # 使用我们之前讨论的扁平化函数
            custom_response_data['errors'] = _flatten_drf_errors(exc.detail)
            # response.data = exc.detail # DRF 默认会将 ValidationError 的 detail 直接作为 data
        elif isinstance(exc, APIException): # 处理其他DRF的APIException
            custom_response_data['message'] = exc.detail # APIException 通常把错误信息放在 detail
            if isinstance(exc.detail, (list, dict)): # 如果detail本身是结构化的
                 custom_response_data['errors'] = exc.detail
            else: # 如果detail是简单字符串
                 custom_response_data['errors'] = [{'non_field_errors': str(exc.detail)}]

        # 你可以为其他特定的DRF异常（AuthenticationFailed, PermissionDenied, NotFound等）添加更多elif分支
        # 例如，对于 NotAuthenticated:
        # elif response.status_code == status.HTTP_401_UNAUTHORIZED:
        #     custom_response_data['message'] = '用户未认证或认证失败'
        #     custom_response_data['errors'] = response.data.get('detail', '请先登录')

        response.data = custom_response_data #用我们的自定义结构替换掉DRF的默认结构

    else: # DRF 的默认处理器返回了 None，表示它不能处理这个异常
        # 这可能是 Django 的 Http404，或者其他 Python 异常
        # 我们需要自己构建一个 Response
        status_code = status.HTTP_500_INTERNAL_SERVER_ERROR # 默认为500
        error_message = '服务器内部错误，请联系管理员。'
        detailed_errors = None

        if isinstance(exc, Http404):
            status_code = status.HTTP_404_NOT_FOUND
            error_message = '您请求的资源未找到。'
            detailed_errors = str(exc) # 或者更友好的信息
        # 对于其他未预期的Python异常，可以记录日志
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Unhandled exception: {exc}", exc_info=True)
        # 注意：在生产环境中，不应将详细的Python错误信息（如str(exc)）暴露给客户端

        response_data = {
            'code': status_code,
            'message': error_message,
            'errors': detailed_errors if detailed_errors else str(exc) if context['request'].method == 'GET' and settings.DEBUG else None, # 调试时可显示具体错误
            'data': None
        }
        response = Response(response_data, status=status_code)

    return response