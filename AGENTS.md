# Manutenção do ViewLab

[AGENT.md](AGENT.md) contém a especificação funcional original. Preserve os requisitos abaixo ao modificar o simulador.

## Modelo distribuído

- Mantenha os 16 nós com identificadores de 1 a 16, a rede totalmente conectada e a prioridade correspondente ao identificador.
- No início, todos conhecem o líder 16. O motor provoca sua falha permanente e informa apenas o iniciador escolhido. Os outros nós entram na eleição ao receber mensagens.
- Cada nó decide com seu próprio estado, a lista fixa de identificadores, suas mensagens recebidas e seus timeouts. O motor usa a disponibilidade para entregar ou descartar uma mensagem. A lógica do nó desconhece a disponibilidade de outros nós.
- Envie ELECTION a todos os identificadores superiores, inclusive ao nó falho. Toda ELECTION entregue produz um OK, ainda que o destinatário esteja em eleição. Evite eleições redundantes.
- Invalide a espera por OK ao receber a primeira resposta. Invalide a espera pelo líder ao receber um COORDINATOR válido. A expiração da espera por COORDINATOR inicia uma nova eleição.
- A ausência de OK dá a liderança ao próprio nó, que anuncia o resultado a cada identificador inferior. O nó 15 emerge da execução dessas regras.

## Motor e apresentação

- Mantenha independentes a lógica distribuída, o motor de eventos discretos e a apresentação.
- Preserve a transmissão de 1 unidade, o timeout de OK de 3 unidades, o timeout de COORDINATOR de 10 unidades e o tempo de processamento local zero.
- Ordene os eventos pelo instante lógico e pela prioridade. Entregas precedem expirações no mesmo instante. A ordem de inserção resolve os demais empates.
- Considere a eleição concluída com um único líder ativo reconhecido por todos os nós ativos, sem eleições em andamento, mensagens em trânsito ou eventos válidos pendentes. Exclua os timeouts invalidados desse critério.
- Controle o deslocamento em SVG pelo ritmo visual. A velocidade, a pausa e o avanço manual devem produzir o mesmo histórico lógico. Preserve as trajetórias simultâneas e os efeitos de entrega e descarte.
- Preserve o histórico completo e cronológico, os filtros e o CSV. Conte cada envio uma vez e mantenha `enviadas = entregues + não entregues + em trânsito`.
- Use as fórmulas teóricas exclusivamente no gráfico, na comparação e na validação.
- Mantenha a interface em português brasileiro e a execução offline por `file://`, com JavaScript puro e arquivos locais.

## Validação

Execute `node tests.js` depois de alterações no algoritmo, no motor ou na reprodução. Para alterações de interface, verifique a abertura de `index.html`, a seleção de nó, os controles, os filtros e o CSV. Confira particularmente o nó 1, com 239 envios e 15 descartes, e o nó 15, com 15 envios e 1 descarte.
