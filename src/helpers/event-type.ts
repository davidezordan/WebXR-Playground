export enum EventType {
    play,
    pause,
    exit,
    sizeUp,
    sizeDown
}

export type ControllerEventHandler = (evt: EventType) => void;
