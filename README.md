# StreamDB - GoLedger Challenge

Interface web para um catálogo de séries de TV, tipo IMDB, conectado a uma API blockchain.

## O que dá pra fazer

- Cadastrar, editar e excluir séries, temporadas e episódios
- Criar watchlists personalizadas
- Buscar posters automaticamente pela API do TMDB

## Rodando o projeto

```bash
# Instalar dependências
npm install

# Copiar arquivo de ambiente (credenciais já incluídas)
cp .env.example .env

# Rodar em modo desenvolvimento
npm run dev
```

Acesse `http://localhost:5173`

## Tecnologias

- React 19 + TypeScript + Vite
- Tailwind CSS
- React Query (TanStack)
- React Router

## API

- **Servidor**: `http://ec2-50-19-36-138.compute-1.amazonaws.com`
- **Documentação**: `http://ec2-50-19-36-138.compute-1.amazonaws.com/api-docs/index.html`
