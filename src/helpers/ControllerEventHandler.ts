import { EventType } from "./event-type";

export type ControllerEventHandler = (evt: EventType) => void;
