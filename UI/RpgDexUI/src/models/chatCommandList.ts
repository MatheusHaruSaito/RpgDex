import { CommandModel } from './commandModel';

export const chatCommandList: CommandModel[] = [
  {
    name: 'roll',
    aliases: ['roll', 'rolar'],
    description: 'roll',
    run: ([count, sides]) => {
      console.log(sides);
      if (Number(count) > 100) return;
      if (Number(sides) > 2500) return;

      return Array.from(
        { length: Number(count) },
        () => Math.floor(Math.random() * Number(sides)) + 1,
      );
    },
  },
];
