<?php
Yii::import('zii.widgets.CListView');
class MyListView extends CListView
{
	public $sortCriteria = array();

	/**
	 * Renders the sorter.
	 */
	public function renderSorter()
	{
		$controller = $this->getController();
		$url = $controller->createUrl($controller->getRoute());
		
		if($this->dataProvider->getItemCount()<=0 || !$this->enableSorting)
			   return;
		echo CHtml::openTag('div',array('class'=>$this->sorterCssClass))."\n";
		echo $this->sorterHeader===null ? Yii::t('zii','Sort by: ') : $this->sorterHeader;
		echo CHtml::dropDownList(null,null,array(''=>'Select')+$this->sortCriteria,array(
			'id'=>'sortBy',
			'onchange'=>"$.fn.yiiListView.update('yw0',{ url:'".$url."?".ucfirst($controller->id)."_sort='+$('#sortBy').val()})"));                
		echo $this->sorterFooter;
		echo CHtml::closeTag('div');
	}
}

?>