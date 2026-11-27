# ViewLab · Algoritmo do Valentão

Simulador didático da eleição de líder em uma rede totalmente conectada de 16 nós. Todos reconhecem o nó 16 como líder até sua falha permanente. O nó escolhido detecta a falha no instante lógico zero e inicia a eleição.

## Como usar

Abra [index.html](index.html) diretamente no navegador. A aplicação funciona offline e usa HTML, CSS, SVG e JavaScript puro.

1. Escolha o nó iniciador entre 1 e 15.
2. Clique em **Iniciar** para reproduzir automaticamente ou em **Passo** para processar um evento por vez desde a falha do líder.
3. Em reprodução automática, use **Pausar** para congelar a execução e a animação. Use **Continuar** para retomá-las. A velocidade altera o ritmo da reprodução e o relógio indica o instante do último evento processado.
4. Selecione um nó na rede por clique, Enter ou Espaço para consultar o estado, o líder conhecido, as respostas OK e os contadores locais. A borda azul tracejada identifica o iniciador durante toda a rodada. Passe o ponteiro sobre uma seta em trânsito para ver seu tipo, identificador e rota. Um anel marca a entrega e um × vermelho marca o descarte.
5. Combine os filtros de nó, mensagem e evento para examinar o registro. **Exportar CSV** salva o histórico completo da rodada, com os identificadores das mensagens. A tabela final compara os valores observados e teóricos.
6. Use **Reiniciar** para limpar a execução. O nó iniciador e a velocidade permanecem selecionados para facilitar a repetição.

## Arquitetura

| Arquivo | Responsabilidade |
| --- | --- |
| `index.html` e `styles.css` | Interface em português brasileiro e layout responsivo. |
| `node.js` | Estado local e decisões de cada instância do algoritmo. |
| `message.js` | Identificação, origem, destino, instantes e estado de cada mensagem. |
| `simulator.js` | Fila ordenada, relógio lógico, entrega, histórico e condições de encerramento. |
| `statistics.js` | Contadores observados e função de análise teórica. |
| `playback.js` | Ritmo de reprodução, pausa, avanço unitário e interpolação do relógio visual. |
| `visualization.js` | Rede SVG, trajetórias e efeitos de entrega ou descarte. |
| `app.js` | Integração dos controles, filtros, exportação, resultados e gráfico. |
| `tests.js` | Validação automatizada do motor e da reprodução com o Node.js. |

Os scripts clássicos são carregados na ordem declarada em `index.html` e compartilham o namespace `ViewLab`. Isso permite executar a aplicação diretamente por `file://`.

### Eleição e mensagens

Cada nó conhece os identificadores da rede e mantém localmente seu estado, líder, respostas e timeouts. Uma eleição envia ELECTION a todos os nós superiores, inclusive ao líder falho. Um nó ativo responde a cada ELECTION com OK e inicia uma eleição apenas se ainda estiver fora de uma. O primeiro OK invalida o timeout correspondente e inicia a espera pelo anúncio COORDINATOR. Se essa espera expirar, o nó inicia outra eleição. Se nenhum OK chegar, o nó assume a liderança e envia COORDINATOR individualmente aos nós inferiores.

A transmissão dura 1 unidade lógica, a espera por OK dura 3 unidades e a espera por COORDINATOR dura 10 unidades. O processamento local ocorre no instante do evento. A fila ordena por instante, depois por prioridade e, em caso de empate, por ordem de inserção. Uma entrega tem prioridade sobre um timeout no mesmo instante. Os timeouts são invalidados por identificador e descartados ao chegarem ao início da fila.

O motor encerra a eleição após verificar o consenso entre os nós ativos, um único líder ativo, ausência de eleições em andamento, nenhuma mensagem em trânsito e fila sem eventos válidos. Os contadores são alimentados pelos envios e seus desfechos. A teoria usa `d = 16 − k` e `Total = d² + 14`, em que `k` é o nó iniciador.

## Testes

Execute com Node.js 20 ou superior, a partir desta pasta:

```sh
node tests.js
```

Os testes cobrem os 15 iniciadores, as contagens a cada evento, a eleição de um líder único, a equivalência entre execução contínua e passo a passo, a pausa e retomada, o reinício e os timeouts. Consulte o [relatório de testes](RELATORIO-TESTES.md) para ver os resultados por cenário e o alcance da verificação de integração.
