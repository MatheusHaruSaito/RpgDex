import { CommandModel } from './commandModel';

export const chatCommandList: CommandModel[] = [
  {
    name: 'roll',
    aliases: ['roll', 'rolar'],
    description: 'roll',
    run: ([count, sides]) => {
      if (Number(count) > 100) return;
      if (Number(sides) > 2500) return;

      let value: number[] = [];
      for (let i = 0; i < Number(count); i++) {
        value.push(Math.floor(Math.random() * Number(sides) + 1));
      }
      return value;
    },
  },
];
