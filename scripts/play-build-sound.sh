#!/bin/bash

# 播放多次声音以确保能听到
for i in {1..3}
do
    # 使用 Submarine 声音，它更长更明显
    afplay /System/Library/Sounds/Submarine.aiff
    # 等待声音播放完毕
    sleep 1
done

# 输出构建完成消息
echo "✅ 构建完成！"
