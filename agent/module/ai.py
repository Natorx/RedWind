import sys
import requests
import json
import time
import os

API_KEY = os.getenv("DEEPSEEK_API_KEY", "your_api_key")
BASE_URL = "https://api.deepseek.com/v1/chat/completions"

def deepseek_chat(messages: list, model: str = "deepseek-v4-flash", max_retries: int = 3) -> str:
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": model,
        "messages": messages,
        "temperature": 0.7,
        "stream": True
    }

    for attempt in range(max_retries):
        try:
            # post请求，json为配置好的payload，headers放入APIkey作为认证信息
            resp = requests.post(BASE_URL, json=payload, headers=headers, stream=True, timeout=30)
            # 检查错误=》不是200的状态码，抛出异常
            resp.raise_for_status()

            full_content = ""
            usage_info = None

            for line in resp.iter_lines(decode_unicode=True):
                if line:
                    if line.startswith("data: "):
                        data_str = line[6:]
                        if data_str == "[DONE]":
                            print()
                            if usage_info:
                                prompt = usage_info.get("prompt_tokens", "?")
                                completion = usage_info.get("completion_tokens", "?")
                                total = usage_info.get("total_tokens", "?")
                                print(f"[Token使用] 输入: {prompt} | 输出: {completion} | 总计: {total}")
                            return full_content
                        try:
                            chunk = json.loads(data_str)
                            if "usage" in chunk and chunk["usage"] is not None:
                                usage_info = chunk["usage"]
                            if "choices" in chunk and len(chunk["choices"]) > 0:
                                delta = chunk["choices"][0].get("delta", {})
                                content = delta.get("content")
                                if content:
                                    full_content += content
                                    print(content, end="", flush=True)
                        except json.JSONDecodeError:
                            continue
            return full_content

        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 503:
                if attempt < max_retries - 1:
                    wait_time = (attempt + 1) * 2
                    print(f"\n服务暂时不可用 (503)，{wait_time}秒后进行第{attempt + 2}次重试...", file=sys.stderr)
                    time.sleep(wait_time)
                else:
                    print(f"\n错误：多次重试后服务仍然不可用，请稍后再试。", file=sys.stderr)
                    print(f"详细错误: {e}", file=sys.stderr)
                    sys.exit(1)
            else:
                print(f"\nHTTP错误: {e}", file=sys.stderr)
                sys.exit(1)

        except requests.exceptions.Timeout:
            if attempt < max_retries - 1:
                print(f"\n请求超时，{attempt + 2}秒后进行第{attempt + 2}次重试...", file=sys.stderr)
                time.sleep(attempt + 2)
            else:
                print(f"\n错误：请求超时，请检查网络连接。", file=sys.stderr)
                sys.exit(1)

        except requests.exceptions.ConnectionError as e:
            if attempt < max_retries - 1:
                print(f"\n连接错误，{attempt + 2}秒后进行第{attempt + 2}次重试...", file=sys.stderr)
                time.sleep(attempt + 2)
            else:
                print(f"\n错误：无法连接到API服务器，请检查网络。", file=sys.stderr)
                print(f"详细错误: {e}", file=sys.stderr)
                sys.exit(1)

        except Exception as e:
            print(f"\n未知错误: {e}", file=sys.stderr)
            sys.exit(1)

    return ""