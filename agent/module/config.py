# module/config.py
import configparser
import os

def load_config(base_dir):
    config_path = os.path.join(base_dir, 'config.ini')
    config = configparser.ConfigParser()
    # 关键：强制使用 UTF-8 编码读取
    with open(config_path, 'r', encoding='utf-8-sig') as f:   # utf-8-sig 可兼容 BOM
        config.read_file(f)
    defaults = config['DEFAULT']
    return {
        'skill_enabled': defaults.getboolean('skill_enabled', True),
        'stream_output': defaults.getboolean('stream_output', False),
        'api_key': defaults.get('api_key', '').strip(),
        'example_root': defaults.get('example_root', 'example'),
    }
