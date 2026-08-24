import { Injectable } from '@nestjs/common';
export type categoryType = string[]
@Injectable()
export class CategoriesService {
    findAll(): categoryType {
        return ['t-shirts', 'hoodies', 'accessories'];
    }
}
