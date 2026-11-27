# Agente de desenvolvimento — Simulador do Algoritmo do Valentão

## 1. Papel do agente

Atue como um desenvolvedor de software especializado em sistemas distribuídos, simulação orientada a eventos discretos e desenvolvimento de aplicações web interativas para fins didáticos.

Sua tarefa é implementar um simulador do algoritmo do valentão (*Bully Algorithm*) para eleição de líder em um sistema distribuído.

Priorize a correção algorítmica, a clareza da representação visual e a qualidade didática da aplicação.

## 2. Requisitos tecnológicos

- Utilize HTML5, CSS3 e JavaScript.
- Utilize JavaScript puro, sem frameworks ou bibliotecas externas.
- Utilize SVG para representar graficamente a rede e as mensagens.
- A aplicação deve executar integralmente no navegador.
- Não utilize serviços externos, servidores de aplicação ou bancos de dados.
- A aplicação deve funcionar localmente, inclusive sem conexão com a internet.
- Separe a lógica do algoritmo, o motor de simulação e a interface gráfica.

## 3. Modelo do sistema distribuído

Implemente um sistema distribuído com as seguintes características:

- Exatamente 16 nós, numerados de 1 a 16.
- Rede completamente conectada.
- Identificadores únicos e ordenados.
- A prioridade de um nó corresponde ao seu identificador.
- Inicialmente, todos os nós reconhecem o nó 16 como líder.
- No início da simulação, o nó 16 sofre uma falha permanente.
- O usuário informa qual dos nós, entre 1 e 15, identifica a falha.
- Apenas o nó selecionado identifica inicialmente a falha.
- Os demais nós tomam conhecimento da eleição exclusivamente por meio do recebimento de mensagens.
- Não ocorrem novas falhas ou recuperações durante a simulação.
- Os canais de comunicação entre nós ativos são confiáveis.

O nó 15 deverá ser eleito como consequência da execução do algoritmo, e não por uma decisão previamente programada no motor de simulação.

## 4. Implementação do algoritmo

Cada nó deverá possuir sua própria instância do algoritmo do valentão, mantendo seu estado local.

### 4.1. Início da eleição

Quando um nó identifica a falha do líder:

1. Altera seu estado para "Em eleição".
2. Envia uma mensagem ELECTION para cada nó com identificador superior ao seu.
3. Inicia um timeout para aguardar respostas.

As mensagens deverão ser enviadas inclusive aos nós falhos, uma vez que o emissor não conhece diretamente a disponibilidade dos destinatários.

### 4.2. Recebimento de ELECTION

Quando um nó ativo recebe uma mensagem ELECTION:

1. Envia uma mensagem OK ao remetente.
2. Verifica se já está participando de uma eleição.
3. Caso não esteja, inicia sua própria eleição.
4. Caso já esteja participando, não inicia uma eleição redundante.

O envio de OK deverá ocorrer independentemente de o nó já estar participando de uma eleição.

Nós falhos não processam mensagens nem produzem respostas.

### 4.3. Recebimento de OK

Quando um nó recebe uma mensagem OK:

1. Registra a resposta.
2. Reconhece a existência de pelo menos um nó ativo com prioridade superior.
3. Passa a aguardar o anúncio do novo líder.
4. Cancela ou invalida o timeout associado à ausência de respostas.

Implemente também um timeout para a espera da mensagem COORDINATOR. Caso expire, o nó deverá reiniciar a eleição, conforme o algoritmo original.

Nas condições normais deste simulador, esse segundo timeout não deverá expirar.

### 4.4. Ausência de respostas

Quando expira o timeout de uma eleição sem que nenhuma mensagem OK tenha sido recebida:

1. O nó assume a liderança.
2. Atualiza seu líder conhecido para seu próprio identificador.
3. Envia individualmente uma mensagem COORDINATOR para cada nó de identificador inferior.

### 4.5. Recebimento de COORDINATOR

Quando um nó recebe uma mensagem COORDINATOR válida:

1. Atualiza seu líder conhecido.
2. Encerra sua participação na eleição.
3. Cancela ou invalida os timeouts associados à eleição.
4. Retorna ao estado normal.

## 5. Modelo de simulação

Implemente um motor de simulação orientado a eventos discretos.

O motor deverá manter:

- Relógio lógico.
- Fila de eventos futuros.
- Estado individual dos 16 nós.
- Conjunto de mensagens em trânsito.
- Histórico completo dos eventos.
- Contadores de mensagens.

Utilize inicialmente os seguintes parâmetros:

| Parâmetro | Valor |
|---|---:|
| Tempo lógico de transmissão | 1 unidade |
| Timeout para recebimento de OK | 3 unidades |
| Timeout para recebimento de COORDINATOR | 10 unidades |
| Tempo de processamento local | 0 unidades |

Eventos com o mesmo instante lógico deverão ser processados em ordem determinística. Eventos de entrega de mensagens deverão ter prioridade sobre eventos de expiração de timeout.

O relógio lógico deverá ser independente da velocidade das animações.

Não utilize temporizadores JavaScript como mecanismo principal de execução do algoritmo. Eles poderão ser utilizados exclusivamente para controlar a apresentação visual e o ritmo da simulação.

O motor poderá conhecer o estado global do sistema para fins de simulação, visualização e validação. Entretanto, a lógica executada por cada nó deverá utilizar exclusivamente seu estado local, as mensagens recebidas e seus próprios timeouts.

## 6. Estruturas de dados

### 6.1. Nó

Cada nó deverá manter, no mínimo:

- Identificador.
- Disponibilidade.
- Estado atual.
- Identificador do líder conhecido.
- Indicador de eleição em andamento.
- Identificadores dos nós que responderam à eleição.
- Referências ou identificadores dos timeouts ativos.
- Contadores individuais de mensagens enviadas.
- Contadores individuais de mensagens recebidas.

### 6.2. Mensagem

Cada mensagem deverá possuir:

- Identificador único.
- Tipo.
- Origem.
- Destino.
- Instante lógico de envio.
- Instante lógico previsto para chegada.
- Instante efetivo de entrega, quando aplicável.
- Situação: em trânsito, entregue ou não entregue.

### 6.3. Evento

Cada evento deverá possuir:

- Identificador único.
- Instante lógico.
- Tipo.
- Nó associado.
- Dados complementares.
- Prioridade de processamento.

## 7. Interface gráfica

Organize a interface em cinco regiões:

1. Painel de controle.
2. Representação gráfica da rede.
3. Contadores de mensagens.
4. Registro cronológico dos eventos.
5. Painel de resultados.

### 7.1. Painel de controle

Disponibilize os seguintes controles:

| Controle | Comportamento |
|---|---|
| Nó iniciador | Seleção de um identificador entre 1 e 15. |
| Iniciar | Provoca a falha do líder e inicia a simulação. |
| Pausar | Suspende a execução e as animações. |
| Continuar | Retoma a execução. |
| Passo | Processa o próximo evento válido da fila. |
| Reiniciar | Restaura completamente o estado inicial. |
| Velocidade | Ajusta a velocidade da apresentação visual. |

Apresente também o valor atual do relógio lógico.

Não permita alterar o nó iniciador durante uma eleição em andamento.

### 7.2. Representação da rede

Represente os 16 nós distribuídos circularmente, em posições fixas.

Cada nó deverá ser identificado por seu número.

Utilize as seguintes convenções visuais:

| Estado | Cor |
|---|---|
| Ativo, em funcionamento normal | Cinza |
| Iniciador da eleição | Azul |
| Em eleição | Laranja |
| Aguardando o novo líder | Roxo |
| Líder | Verde |
| Falho | Vermelho |

A identificação do nó iniciador deverá permanecer visível mesmo após a alteração de seu estado, por meio de uma borda ou outro marcador gráfico.

Não desenhe permanentemente todas as conexões da rede. Apresente apenas as conexões utilizadas pelas mensagens em trânsito.

Ao selecionar um nó, apresente suas informações internas, incluindo seu estado, líder conhecido e contadores individuais.

### 7.3. Representação das mensagens

Utilize as seguintes convenções:

| Mensagem | Cor |
|---|---|
| ELECTION | Azul |
| OK | Verde |
| COORDINATOR | Roxo |

Cada mensagem deverá ser representada por um elemento gráfico animado, deslocando-se do nó emissor ao nó destinatário.

A representação deverá permitir identificar claramente:

- Origem.
- Destino.
- Sentido da transmissão.
- Tipo da mensagem.
- Entrega ou descarte.

Todas as mensagens deverão ser visualizadas, inclusive aquelas destinadas ao nó falho.

Mensagens destinadas ao nó falho deverão desaparecer ao chegar ao destino, acompanhadas de uma indicação visual de descarte.

Mensagens simultâneas deverão ser representadas simultaneamente. Não serialize artificialmente a comunicação para facilitar a animação.

Quando necessário, utilize trajetórias curvas ou deslocamentos gráficos para reduzir a sobreposição.

Nenhuma mensagem poderá ser omitida da representação ou do histórico, mesmo no pior caso.

## 8. Contabilização das mensagens

Mantenha os seguintes contadores globais:

- Mensagens ELECTION enviadas.
- Mensagens OK enviadas.
- Mensagens COORDINATOR enviadas.
- Total de mensagens enviadas.
- Total de mensagens entregues.
- Total de mensagens não entregues.
- Total de mensagens em trânsito.

Cada mensagem deverá ser contabilizada exatamente uma vez, no momento de seu envio.

Mensagens destinadas ao nó falho deverão integrar o total de mensagens enviadas.

A seguinte propriedade deverá ser preservada durante toda a execução:

Total de mensagens enviadas = mensagens entregues + mensagens não entregues + mensagens em trânsito.

Os timeouts e demais eventos locais não deverão ser contabilizados como mensagens.

A identificação inicial da falha será considerada um evento externo ao algoritmo. Eventuais mensagens utilizadas para detectar essa falha não integrarão a contagem.

## 9. Registro cronológico

Mantenha um registro completo e cronologicamente ordenado da execução.

Cada entrada deverá apresentar:

- Número sequencial.
- Instante lógico.
- Tipo de evento.
- Nó de origem, quando aplicável.
- Nó de destino, quando aplicável.
- Tipo de mensagem, quando aplicável.
- Descrição do evento.

Registre, entre outros:

- Falha do líder.
- Identificação da falha.
- Início de uma eleição.
- Envio de mensagens.
- Entrega de mensagens.
- Descarte de mensagens.
- Expiração de timeouts.
- Alterações de estado.
- Declaração do novo líder.
- Encerramento da simulação.

Permita filtrar o registro por nó, tipo de mensagem e tipo de evento.

Disponibilize a exportação do histórico em formato CSV.

## 10. Encerramento da simulação

Considere a eleição concluída quando:

- Todos os nós ativos reconhecem o mesmo líder.
- Existe exatamente um nó ativo no estado de líder.
- Não existem mensagens em trânsito.
- Não existem eleições em andamento.
- Não existem eventos válidos pendentes na fila.

Eventos invalidados ou cancelados não deverão impedir o encerramento.

Apresente um painel final contendo:

- Identificador do nó iniciador.
- Identificador do líder original.
- Identificador do novo líder.
- Tempo lógico total da eleição.
- Quantidade de mensagens de cada tipo.
- Total de mensagens enviadas.
- Total de mensagens entregues.
- Total de mensagens não entregues.
- Quantidade de nós que reconhecem o novo líder.

## 11. Análise teórica

Apresente uma comparação entre o número de mensagens efetivamente produzidas pela simulação e o número esperado teoricamente.

Considere:

- n: quantidade total de nós, incluindo o líder falho.
- k: identificador do nó iniciador.
- d = n − k.

Utilize as seguintes expressões:

- ELECTION = d × (d + 1) / 2.
- OK = d × (d − 1) / 2.
- COORDINATOR = n − 2.
- Total = d² + n − 2.
- Mensagens não entregues = d.

Para a rede de 16 nós:

Total = (16 − k)² + 14.

Essas expressões deverão ser utilizadas exclusivamente para análise e validação. Não deverão determinar os contadores da simulação.

Apresente um gráfico de barras mostrando o custo teórico para cada possível nó iniciador, destacando o nó selecionado.

## 12. Arquitetura do software

Organize a aplicação, preferencialmente, nos seguintes arquivos:

| Arquivo | Responsabilidade |
|---|---|
| index.html | Estrutura da interface. |
| styles.css | Estilos e organização visual. |
| node.js | Estado e comportamento individual dos nós. |
| message.js | Representação das mensagens. |
| simulator.js | Motor de simulação e fila de eventos. |
| visualization.js | Representação SVG e animações. |
| statistics.js | Contadores e análise teórica. |
| app.js | Integração entre os componentes. |
| tests.js | Testes automatizados. |
| README.md | Documentação da aplicação. |
| AGENTS.md | Instruções e restrições para manutenção por agentes de desenvolvimento. |

A organização poderá ser ajustada mediante justificativa técnica.

Garanta que a aplicação possa ser aberta diretamente pelo arquivo index.html, sem depender de um servidor HTTP local.

Evite mecanismos de carregamento de módulos incompatíveis com a execução por meio do protocolo file://.

## 13. Testes obrigatórios

Implemente testes automatizados para todos os 15 possíveis nós iniciadores.

Utilize os seguintes valores como referência:

| Iniciador | ELECTION | OK | COORDINATOR | Total | Não entregues |
|---:|---:|---:|---:|---:|---:|
| 1 | 120 | 105 | 14 | 239 | 15 |
| 2 | 105 | 91 | 14 | 210 | 14 |
| 3 | 91 | 78 | 14 | 183 | 13 |
| 4 | 78 | 66 | 14 | 158 | 12 |
| 5 | 66 | 55 | 14 | 135 | 11 |
| 6 | 55 | 45 | 14 | 114 | 10 |
| 7 | 45 | 36 | 14 | 95 | 9 |
| 8 | 36 | 28 | 14 | 78 | 8 |
| 9 | 28 | 21 | 14 | 63 | 7 |
| 10 | 21 | 15 | 14 | 50 | 6 |
| 11 | 15 | 10 | 14 | 39 | 5 |
| 12 | 10 | 6 | 14 | 30 | 4 |
| 13 | 6 | 3 | 14 | 23 | 3 |
| 14 | 3 | 1 | 14 | 18 | 2 |
| 15 | 1 | 0 | 14 | 15 | 1 |

Verifique também as seguintes propriedades:

- O nó 15 é eleito em todas as execuções.
- Todos os nós ativos reconhecem o mesmo líder.
- Nenhum nó falho envia mensagens.
- Nenhuma mensagem ELECTION é enviada a um nó de identificador inferior.
- Toda mensagem ELECTION entregue produz exatamente uma mensagem OK.
- Nenhum nó inicia eleições redundantes nas condições previstas.
- Toda mensagem enviada possui um identificador único.
- Toda mensagem enviada termina como entregue ou não entregue.
- Os contadores observados correspondem aos valores teóricos.
- A alteração da velocidade não interfere no resultado.
- A execução passo a passo produz o mesmo resultado da execução contínua.
- Pausar e continuar não altera o resultado.
- Reiniciar elimina todos os estados e eventos da execução anterior.
- Não existem timeouts válidos pendentes após o encerramento.

## 14. Requisitos de qualidade

- Utilize nomes significativos para classes, funções e variáveis.
- Documente as decisões relacionadas ao algoritmo distribuído.
- Mantenha o motor de simulação independente da interface gráfica.
- Evite duplicação de código.
- Evite dependências desnecessárias.
- Não utilize valores teóricos para fabricar resultados.
- Não implemente sequências de mensagens previamente determinadas.
- Não permita que um nó consulte diretamente o estado de outro nó.
- Não permita que a animação determine a ordem lógica dos eventos.
- Utilize uma interface limpa, adequada à projeção em sala de aula.
- Garanta legibilidade dos textos, números e mensagens.
- Utilize português brasileiro na interface.

## 15. Procedimento de desenvolvimento

Execute o desenvolvimento na seguinte ordem:

1. Defina as estruturas de dados.
2. Implemente a fila de eventos e o relógio lógico.
3. Implemente o comportamento individual dos nós.
4. Implemente o envio e a entrega das mensagens.
5. Implemente os timeouts.
6. Implemente os contadores.
7. Execute os testes do algoritmo sem interface gráfica.
8. Corrija eventuais divergências entre resultados teóricos e observados.
9. Implemente a interface gráfica.
10. Implemente as animações.
11. Integre os controles de execução.
12. Implemente o histórico e a exportação.
13. Execute os testes de integração.
14. Produza a documentação.

Não avance para a implementação das animações antes de validar o funcionamento do algoritmo.

## 16. Entregáveis

Ao concluir o trabalho, forneça:

- Código-fonte completo.
- Aplicação web funcional.
- Testes automatizados.
- Relatório dos resultados dos testes.
- Arquivo README.md com instruções de execução e descrição da arquitetura.
- Arquivo AGENTS.md com as restrições arquiteturais e algorítmicas que deverão ser preservadas em futuras modificações.

Informe explicitamente quaisquer requisitos não atendidos, limitações encontradas e decisões que tenham exigido alterações nesta especificação.

Não declare o trabalho concluído enquanto houver divergências entre o comportamento observado e o comportamento esperado do algoritmo.
