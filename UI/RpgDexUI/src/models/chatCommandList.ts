import { CommandModel } from './commandModel';

export const chatCommandList: CommandModel[] = [
  {
    name: 'roll',
    aliases: ['roll', 'rolar'],
    description: 'roll',
    run: (args) => {
      let value: string[] = [];
      for (let i = 0; i < Number(args[0]); i++) {
        value.push(Math.floor(Math.random() * Number(args[1]) + 1).toString());
      }
      return value;
    },
  },
];
