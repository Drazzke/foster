/**
 * Custom list class that allows entries to be removed while the list is being iterated over
 * Used for Entity and Renderer lists (so you can iterate over entities and remove them)
 */
export class ObjectList<T>
{
	[key: string]: any

	private objects:T[] = [];
	public unsorted:boolean;
	private dirty:boolean;
	private _count:number = 0;
	public get count():number { return this._count; }

	/**
	 * Adds an object to the List
	 * @param object the object to add
	 */
	public add(object:T):T
	{
		this.objects.push(object);
		this._count ++;
		this.unsorted = true;
		return object;
	}

	public contains(object:T):boolean
	{
		return object != null && this.objects.indexOf(object) >= 0;
	}

	/**
	 * Gets the first entry in the list
	 */
	public first():T
	{
		let entry:T = null;
		for (let i = 0; i < this.objects.length && entry == null; i ++)
			entry = this.objects[i];
		return entry;
	}

	_iterating = false;

	public map<V>(callback:(object:T)=>V):V[]
	{
		const count = this.objects.length;
		let res:V[] = [];
		for (let i = 0; i < count; ++i)
			res.push(callback(this.objects[i]));
		return res;
	}

	/**
	 * Iterates over every object in the List. Return false in the callback to break
	 * @param callback
	 */
	public each(callback:(object:T)=>any):void
	{
		const count = this.objects.length;
		this._iterating = true;
		for (let i = 0; i < count; i ++)
			if (this.objects[i] != null)
				if (callback(this.objects[i]) === false)
					break;
		this._iterating = false;
		if (this._moveAfters.length > 0)
		{
			for (const [obj, index] of this._moveAfters)
				if (this.remove(obj))
					this.objects.splice(index, 0, obj);
			this._moveAfters = [];
			this.dirty = true;
			this.clean();
		}
	}

	_moveAfters:Array<[T, number]> = [];

	public moveAfter(obj:T, index:number)
	{
		if (this._iterating)
			this._moveAfters.push([obj, index]);
		else
			if (this.remove(obj))
				this.objects.splice(index, 0, obj);
	}

	/**
	 * Gets an object at the given index
	 * @param index
	 */
	public at(index:number):T
	{
		for (let i = index; i < this.objects.length; i ++)
			if (this.objects[i] != null)
				return this.objects[i];
		return null;
	}

	/**
	 * Sorts the list by the compare function
	 * @param compare
	 */
	public sort(compare:(a:T, b:T)=>number):void
	{
		if (this.unsorted)
		{
			for (let i = 0; i < this.objects.length - 1; ++i)
			{
				let j = i + 1;
				while (j > 0 && this.objects[j - 1] != null && this.objects[j] != null && compare(this.objects[j - 1], this.objects[j]) > 0)
				{
					const temp = this.objects[j - 1];
					this.objects[j - 1] = this.objects[j];
					this.objects[j--] = temp;
				}
			}
			this.unsorted = false;
		}
	}

	/**
	 * Removes the given object from the list. Returns true if removed
	 * @param object
	 */
	public remove(object:T):boolean
	{
		const index = this.objects.indexOf(object);
		if  (index >= 0)
		{
			this.objects[index] = null;
			this._count --;
			this.dirty = true;
			return true;
		}
		return false;
	}


	/**
	 * Clears the entire list
	 */
	public clear():void
	{
		for (let i = 0; i < this.objects.length; i ++)
			this.objects[i] = null;
		this._count = 0;
		this.dirty = true;
	}

	/**
	 * Cleans the list (removing null entries)
	 */
	public clean():void
	{
		if (this.dirty)
		{
			if (this.count <= 0)
				this.objects = [];
			else
			{
				for (let i = this.objects.length - 1; i >= 0; i --)
					if (this.objects[i] == null)
						this.objects.splice(i, 1);
			}
		}
	}
}
