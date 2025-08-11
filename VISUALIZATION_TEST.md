# 聚合结果可视化功能测试指南

## 功能概述

本系统已成功实现了 Elasticsearch 聚合结果的可视化功能，支持以下图表类型：

- **柱状图**: 适用于 Terms 聚合等分类数据
- **饼图**: 适用于少量分类的分布展示  
- **折线图**: 适用于时间序列数据的趋势展示
- **仪表盘**: 适用于单个数值指标展示

## 测试用例

### 1. Terms 聚合测试

在查询配置中使用"分组聚合"模板，或手动输入：

```json
{
  "match_all": {},
  "aggs": {
    "status_terms": {
      "terms": {
        "field": "status.keyword",
        "size": 10
      }
    }
  }
}
```

**预期结果**: 生成柱状图和饼图展示状态字段的分布

### 2. 时间聚合测试

使用"时间聚合"模板：

```json
{
  "match_all": {},
  "aggs": {
    "date_trend": {
      "date_histogram": {
        "field": "@timestamp",
        "calendar_interval": "day"
      }
    }
  }
}
```

**预期结果**: 生成时间趋势折线图

### 3. 统计聚合测试

使用"统计聚合"模板：

```json
{
  "match_all": {},
  "aggs": {
    "price_stats": {
      "stats": {
        "field": "price"
      }
    }
  }
}
```

**预期结果**: 生成包含统计指标的表格视图

### 4. 复合聚合测试

```json
{
  "match_all": {},
  "aggs": {
    "category_terms": {
      "terms": {
        "field": "category.keyword",
        "size": 5
      },
      "aggs": {
        "avg_price": {
          "avg": {
            "field": "price"
          }
        }
      }
    }
  }
}
```

**预期结果**: 生成分类柱状图和平均价格子聚合图表

## 操作步骤

1. 在搜索页面选择包含数据的索引
2. 选择聚合查询模板或手动输入聚合查询
3. 执行查询
4. 切换到"可视化"标签页查看图表
5. 可以导出图表数据为 JSON 或 CSV 格式

## 功能特点

- ✅ 自动识别聚合类型并生成对应图表
- ✅ 支持多种图表样式（柱状图、饼图、折线图）
- ✅ 支持图表数据导出
- ✅ 响应式设计，适配不同屏幕尺寸
- ✅ 历史可视化记录和管理
- ✅ 实时数据更新和图表重新渲染

## 已实现的组件

1. **ChartVisualization.vue**: 单个图表渲染组件
2. **VisualizationPanel.vue**: 可视化面板主组件
3. **visualization store**: 可视化数据管理
4. **ECharts 集成**: 专业图表库支持

可视化功能已完全集成到搜索结果页面，当查询包含聚合时会自动显示"可视化"标签页。