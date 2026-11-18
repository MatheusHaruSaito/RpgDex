import { Attributes } from "./attributes"
import { Skills } from "./skills"

export interface UpdateCharacter{
    id : string
    icon : File
    name : string
    description? :string
    properties? :any
}
