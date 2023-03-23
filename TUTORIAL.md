# 入门文档：Light Ecosystem Swap Periphery

## 简介

Swap Periphery（https://github.com/Light-Ecosystem/swap-periphery）是一个去中心化交易路由，用于与 Swap Core 进行交互。
在 UniswapV2 的基础上，增加了：

- 调整交易手续费归属社区的比例为的 50%
- 支持白名单管理可交易资产，由社区通过投票获得准入资格，避免不良资产进入交易市场；
- 支持手续费动态可调，由社区来控制交易手续费；
- 支持包含 stHOPE 的交易对索取 LT 奖励；
- 支持社区手续费提取归集；
  同时升级和完善了开发环境、部署脚本和链上合约验证脚本。

- audit report by slow mist（url）
- audit report by certik（url）

## 开始之前

在开始使用本仓库之前，请确保您已经熟悉以下内容：

1. Solidity：智能合约编程语言。
2. Ethereum：去中心化应用平台。
3. Waffle：用于编译、部署和测试智能合约的开发框架。
4. Light Ecosystem Swap Core：本项目与之交互的核心组件。

## 安装、编译、测试、部署和验证

### 克隆仓库

```
git clone https://github.com/Light-Ecosystem/swap-core.git
git clone https://github.com/Light-Ecosystem/swap-periphery.git
cd swap-periphery
```

### 构建 swap core

```
# 安装依赖
yarn --cwd ../swap-core  install
# 编译
yarn --cwd ../swap-core  compile
# 生成合约验证用的代码文件
yarn --cwd ../swap-core  flatten
# 本地发布swap core
yarn --cwd ../swap-core  link
```

### 安装依赖

```
yarn install
yarn link @uniswap/v2-core
```

### 编译

```
yarn compile
```

### 测试

```
yarn test
```

### 部署

```
# 复制配置文件并修改
cp .env.ts.example .env.ts
yarn deploy
```

### 验证

```
yarn verify
```

## 文档

要了解更多关于 Light Ecosystem Swap Core 的信息，请参阅项目的 [GitHub 仓库](https://github.com/Light-Ecosystem/swap-core)。这里您可以找到更多关于智能合约、接口和项目架构的详细信息。

更多详细信息，请参阅项目的[官方文档](https://github.com/Light-Ecosystem/swap-periphery)

## 社区

如果您在使用过程中遇到问题，可以通过以下渠道寻求帮助：

1. [GitHub Issues](https://github.com/Light-Ecosystem/swap-periphery/issues)

## 许可证

本项目采用[GNU 许可证](https://github.com/Light-Ecosystem/swap-periphery/blob/main/LICENSE)。
