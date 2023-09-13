export type Message = {
   unix_time: number;
   node: string;
   data: Data[];
}

type Data = {
   name: string;
   value: number;
   units: string;
}
