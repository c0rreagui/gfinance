# G-Finance - High Fidelity 3D Dashboard

## Design Philosophy: 3D Immersive Glass
O G-Finance evoluiu de uma interface plana para uma experiência tridimensional imersiva, inspirada em tendências de ponta do Spline e design experimental. A interface utiliza **Glassmorphism**, **3D Tilt Interactions** e **Mesh Gradients** para criar profundidade e sofisticação.

## Visual Tokens (OKLch System)
- **Base Canvas**: `oklch(98% 0.004 240)` (Light) / `#020617` (Dark)
- **Glass Surface**: `rgba(255, 255, 255, 0.4)` (Light) / `rgba(15, 23, 42, 0.6)` (Dark)
- **Accent Emerald**: `oklch(56% 0.12 170)`
- **Typography**: 
  - **Display**: `SF Pro Display` (Black weight para títulos)
  - **Body**: `SF Pro Text` (Medium weight para legibilidade)

## Key Wow Factors
1. **3D Tilt Engine**: Todos os cards principais reagem ao movimento do mouse com rotação 3D e efeito de profundidade interna.
2. **Mesh Gradient Background**: Um fundo dinâmico e animado que cria uma atmosfera de software premium.
3. **Glass Credit Card**: Um cartão virtual com fidelidade visual extrema, incluindo reflexos simulados e profundidade 3D.
4. **Smooth SVG Charts**: Gráficos com curvas de Bézier e animações de preenchimento suavizadas.
5. **Universal Dark Mode**: Transições suaves entre temas com adaptação inteligente de contraste e profundidade.

## Architecture
- **React (Babel Standalone)**: Lógica de componentes modularizada.
- **Tailwind CSS**: Utilidades de layout e espaçamento.
- **Lucide Icons**: Iconografia minimalista e consistente.
- **Mock Data**: Isolado para fácil substituição por APIs reais.

## File Map
- `index.html`: Dashboard principal (Visão Geral) com todas as interações 3D.
- `screens/transactions.html`: Gestão detalhada de extratos com filtros.
- `screens/integrations.html`: Conexão segura via Open Finance.
- `screens/settings.html`: Gestão de perfil e preferências.
- `widgets/`: Superfícies do SO (Lock & Home Screen) integradas ao design system.
