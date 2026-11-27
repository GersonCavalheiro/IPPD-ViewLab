# Relatório de testes do ViewLab

**19 testes automatizados aprovados** com `node tests.js` no Node.js 24.16.0. Os 15 iniciadores elegeram o nó 15. Em cada rodada, os 15 nós ativos reconheceram o líder e a execução terminou sem mensagens em trânsito ou timeouts válidos.

## Contagens observadas

As contagens coincidiram com a tabela de referência e com as fórmulas da especificação.

| Iniciador | ELECTION | OK | COORDINATOR | Enviadas | Entregues | Não entregues | Duração (u.t.) |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 120 | 105 | 14 | 239 | 224 | 15 | 5 |
| 2 | 105 | 91 | 14 | 210 | 196 | 14 | 5 |
| 3 | 91 | 78 | 14 | 183 | 170 | 13 | 5 |
| 4 | 78 | 66 | 14 | 158 | 146 | 12 | 5 |
| 5 | 66 | 55 | 14 | 135 | 124 | 11 | 5 |
| 6 | 55 | 45 | 14 | 114 | 104 | 10 | 5 |
| 7 | 45 | 36 | 14 | 95 | 86 | 9 | 5 |
| 8 | 36 | 28 | 14 | 78 | 70 | 8 | 5 |
| 9 | 28 | 21 | 14 | 63 | 56 | 7 | 5 |
| 10 | 21 | 15 | 14 | 50 | 44 | 6 | 5 |
| 11 | 15 | 10 | 14 | 39 | 34 | 5 | 5 |
| 12 | 10 | 6 | 14 | 30 | 26 | 4 | 5 |
| 13 | 6 | 3 | 14 | 23 | 20 | 3 | 5 |
| 14 | 3 | 1 | 14 | 18 | 16 | 2 | 5 |
| 15 | 1 | 0 | 14 | 15 | 14 | 1 | 4 |

## Propriedades verificadas

- Contabilidade global a cada evento executado em modo manual e a cada avanço em modo contínuo. Contadores locais reconciliados com as mensagens do histórico.
- Nenhum envio pelo nó falho. ELECTION somente para nós de prioridade superior e exatamente um OK por ELECTION entregue. Uma eleição por nó participante nas condições padrão.
- Identificadores únicos, histórico cronológico, um envio e um desfecho por mensagem.
- Históricos, contadores e estados finais idênticos em modo passo a passo e em reprodução a 0,25×, 1× e 2×. Pausar, alterar a velocidade e continuar preservaram o resultado.
- Reinício limpou relógio, fila, mensagens, histórico, contadores, nós, timeouts e sequências de identificadores.
- Entrega de OK prevaleceu sobre o timeout no mesmo instante. Um timeout de COORDINATOR antecipado para o teste reiniciou a eleição. Identificadores inválidos foram rejeitados.

## Integração da interface

Um teste com DOM simulado carregou os scripts na ordem declarada no HTML e verificou reprodução, pausa dos elementos em movimento, retomada, reinício, inspeção por teclado e avanço unitário. No cenário do nó 1, a interface manteve 119 elementos de mensagem simultâneos, exibiu os totais esperados e filtrou os 15 descartes destinados ao nó 16. O CSV gerado continha cabeçalho, UTF-8 com BOM e todos os 557 eventos, mesmo com filtros ativos. No cenário do nó 15, os passos chegaram a 15 envios e à conclusão no instante 4.

A inspeção estática confirmou que o HTML referencia apenas arquivos locais e usa scripts clássicos. O ambiente bloqueou a inicialização dos navegadores, deixando pendentes a revisão visual em navegador e a confirmação do download pelo navegador. A geração do arquivo CSV foi verificada no DOM simulado.
