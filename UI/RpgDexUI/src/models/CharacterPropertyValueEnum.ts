export enum CharacterPropertyValueEnum {
  ValueKey = 0,     // Texto Simples / Número Curto
  BooleanFlgs = 1,  // Checkbox / Flag Boleana
  Number = 2,       // Contador numérico com botões (+ / -)
  ResourceBar = 3,  // Barra de Recurso (Atual / Máximo - ex: Vida/PV, Mana)
  Select = 4,       // Caixa de Seleção / Dropdown (ex: Alinhamento, Tamanho)
  TextArea = 5,     // Texto Longo (ex: Anotações, Habilidades)
}