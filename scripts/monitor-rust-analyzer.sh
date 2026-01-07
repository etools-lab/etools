#!/bin/bash
# rust-analyzer 内存监控脚本
# 用法: ./scripts/monitor-rust-analyzer.sh

echo "========================================="
echo "rust-analyzer 内存监控工具"
echo "========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 检查 rust-analyzer 是否运行
check_ra() {
    pgrep -x "rust-analyzer" > /dev/null
    return $?
}

# 获取内存使用 (MB)
get_memory_mb() {
    local pid=$(pgrep -x "rust-analyzer" | head -1)
    if [ -n "$pid" ]; then
        local rss=$(ps -o rss= -p $pid 2>/dev/null | tr -d ' ')
        if [ -n "$rss" ]; then
            echo $((rss / 1024))
        else
            echo "N/A"
        fi
    else
        echo "N/A"
    fi
}

# 获取 CPU 使用率
get_cpu() {
    local pid=$(pgrep -x "rust-analyzer" | head -1)
    if [ -n "$pid" ]; then
        local cpu=$(ps -o %cpu= -p $pid 2>/dev/null | tr -d ' ')
        if [ -n "$cpu" ]; then
            echo "${cpu}%"
        else
            echo "N/A"
        fi
    else
        echo "N/A"
    fi
}

# 获取线程数
get_threads() {
    local pid=$(pgrep -x "rust-analyzer" | head -1)
    if [ -n "$pid" ]; then
        local threads=$(ps -o nlwp= -p $pid 2>/dev/null | tr -d ' ')
        if [ -n "$threads" ]; then
            echo "$threads"
        else
            echo "N/A"
        fi
    else
        echo "N/A"
    fi
}

# 格式化内存大小
format_memory() {
    local mb=$1
    if [ "$mb" == "N/A" ]; then
        echo "N/A"
    elif [ $mb -ge 1024 ]; then
        local gb=$(echo "scale=2; $mb / 1024" | bc)
        echo "${gb}GB (${mb}MB)"
    else
        echo "${mb}MB"
    fi
}

# 显示统计信息
show_stats() {
    echo ""
    echo "========================================="
    echo "当前状态"
    echo "========================================="

    if check_ra; then
        local pid=$(pgrep -x "rust-analyzer" | head -1)
        local mem_mb=$(get_memory_mb)
        local mem_formatted=$(format_memory $mem_mb)
        local cpu=$(get_cpu)
        local threads=$(get_threads)

        echo "PID:         $pid"
        echo "内存占用:    $mem_formatted"
        echo "CPU 使用:    $cpu"
        echo "线程数:      $threads"
        echo "可执行文件:  $(ps -o command= -p $pid)"

        echo ""
        echo "优化建议:"
        if [ "$mem_mb" != "N/A" ]; then
            if [ $mem_mb -gt 4096 ]; then
                echo "  ${RED}❌ 内存过高 (>4GB)${NC}"
                echo "     建议检查 .vscode/settings.json 配置"
                echo "     确保已启用所有优化选项"
            elif [ $mem_mb -gt 2048 ]; then
                echo "  ${YELLOW}⚠️  内存偏高 (2-4GB)${NC}"
                echo "     当前配置已经比较激进"
                echo "     考虑重启 rust-analyzer 释放内存"
            else
                echo "  ${GREEN}✓ 内存正常 (<2GB)${NC}"
                echo "     优化效果良好!"
            fi
        fi
    else
        echo "  ${YELLOW}rust-analyzer 未运行${NC}"
        echo "  请在 VS Code 中打开 Rust 文件以启动"
    fi

    echo ""
    echo "快速操作:"
    echo "  - 重启 rust-analyzer: Cmd+Shift+P → 'rust-analyzer: Restart server'"
    echo "  - 查看完整配置: cat .vscode/settings.json"
    echo ""
}

# 参数处理
case "${1:-}" in
    --stats|-s)
        show_stats
        ;;
    --help|-h)
        echo "rust-analyzer 内存监控工具"
        echo ""
        echo "用法:"
        echo "  $0                 显示当前状态"
        echo "  $0 --stats        显示详细统计"
        echo "  $0 --help         显示此帮助"
        echo ""
        ;;
    *)
        show_stats
        ;;
esac
