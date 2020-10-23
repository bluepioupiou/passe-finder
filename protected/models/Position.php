<?php

/**
 * This is the model class for table "Position".
 *
 * The followings are the available columns in table 'Position':
 * @property string $id
 * @property string $name
 * @property string $description
 * @property string $image
 * @property integer $danse_id
 * @property string $dateCreate
 * @property string $dateMaj
 * @property string $userCreate_id
 *
 * The followings are the available model relations:
 * @property Danse $danse
 * @property User $userCreate
 * @property Position[] $alternatives
 */
class Position extends CActiveRecord
{
	public $image_file;
	/**
	 * Returns the static model of the specified AR class.
	 * @param string $className active record class name.
	 * @return Position the static model class
	 */
	public static function model($className=__CLASS__)
	{
		return parent::model($className);
	}

	/**
	 * @return string the associated database table name
	 */
	public function tableName()
	{
		return 'position';
	}

	/**
	 * @return array validation rules for model attributes.
	 */
	public function rules()
	{
		// NOTE: you should only define rules for those attributes that
		// will receive user inputs.
		return array(
			array('name, description, image, danse_id, dateCreate, dateMaj', 'required'),
			array('danse_id', 'numerical', 'integerOnly'=>true),
			array('name', 'length', 'max'=>250),
			array('image', 'length', 'max'=>150),
			array('image_file', 'file', 'types'=>'jpg, gif, png', 'on' => 'insert'),
			array('image_file', 'file', 'allowEmpty' => true, 'on' => 'update'),
			// The following rule is used by search().
			// Please remove those attributes that should not be searched.
			array('id, name, description, image, danse_id, dateCreate, dateMaj', 'safe', 'on'=>'search'),
		);
	}

	/**
	 * @return array relational rules.
	 */
	public function relations()
	{
		// NOTE: you may need to adjust the relation name and the related
		// class name for the relations automatically generated below.
		return array(
			'danse' => array(self::BELONGS_TO, 'Danse', 'danse_id'),
			'userCreate' => array(self::BELONGS_TO, 'User', 'userCreate_id'),
			'passesStart'=>array(self::HAS_MANY, 'Passe', 'positionStart_id',  'condition' =>'pending=0'),
			'passesStartCount'=>array(self::STAT, 'Passe', 'positionStart_id',  'condition' =>'pending=0'),
			'passesEnd'=>array(self::HAS_MANY, 'Passe', 'positionEnd_id',  'condition' =>'pending=0'),
			'passesEndCount'=>array(self::STAT, 'Passe', 'positionEnd_id',  'condition' =>'pending=0'),
			'alternativesStart'=>array(self::HAS_MANY, 'Alternative', 'positionStart_id'),
			'alternativesStartCount'=>array(self::STAT, 'Alternative', 'positionStart_id'),
		);
	}

	/**
	 * @return array customized attribute labels (name=>label)
	 */
	public function attributeLabels()
	{
		return array(
			'id' => 'Identifiant',
			'name' => 'Nom',
			'description' => 'Description',
			'image' => 'Image',
			'danse' => 'Danse',
			'dateCreate' => 'Date de création',
			'dateMaj' => 'Date de mise à jour',
			'userCreat' => 'Créateur'
		);
	}

	/**
	 * Retrieves a list of models based on the current search/filter conditions.
	 * @return CActiveDataProvider the data provider that can return the models based on the search/filter conditions.
	 */
	public function search()
	{
		// Warning: Please modify the following code to remove attributes that
		// should not be searched.

		$criteria=new CDbCriteria;

		$criteria->compare('id',$this->id,true);
		$criteria->compare('name',$this->name,true);
		$criteria->compare('description',$this->description,true);
		$criteria->compare('image',$this->image,true);
		$criteria->compare('danse_id',$this->danse_id);
		$criteria->compare('dateCreate',$this->dateCreate,true);
		$criteria->compare('dateMaj',$this->dateMaj,true);

		return new CActiveDataProvider($this, array(
			'criteria'=>$criteria,
		));
	}
}