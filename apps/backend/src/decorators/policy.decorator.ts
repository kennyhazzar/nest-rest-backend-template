import { SetMetadata } from '@nestjs/common';

import { Actions } from '@/enums/actions.enum';
import { Subjects } from '@/enums/subjects.enum';

export const POLICY_KEY = 'policy';

export const Policy = (action: Actions, subject: Subjects[] | Subjects) => SetMetadata(POLICY_KEY, [action, subject]);
